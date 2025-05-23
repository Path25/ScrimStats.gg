import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ThemeToggle from '@/components/ThemeToggle';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel as ShadcnFormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import ApiTokenManager from '@/components/ApiTokenManager';
import { useTheme } from '@/contexts/ThemeContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// Schemas
const accentColorSchema = z.object({
  accentColor: z.string().regex(/^#[0-9A-F]{6}$/i, { message: "Must be a valid hex color code (e.g., #RRGGBB)." })
});
type AccentColorFormValues = z.infer<typeof accentColorSchema>;

const logoUploadSchema = z.object({
  logo: z.instanceof(FileList)
    .refine(files => files?.length === 1, "A logo image is required.")
    .refine(files => files?.[0]?.size <= 5 * 1024 * 1024, "Logo image must be 5MB or less.")
    .refine(
      files => ["image/jpeg", "image/png", "image/gif", "image/svg+xml"].includes(files?.[0]?.type),
      "Only .jpg, .png, .gif, .svg files are accepted."
    ),
});
type LogoUploadFormValues = z.infer<typeof logoUploadSchema>;

const changePasswordSchema = z.object({
  currentPassword: z.string().min(8, { message: "Current password must be at least 8 characters." }),
  newPassword: z.string().min(8, { message: "New password must be at least 8 characters." }),
  confirmNewPassword: z.string().min(8, { message: "Please confirm your new password." }),
}).refine(data => data.newPassword === data.confirmNewPassword, {
  message: "New passwords do not match.",
  path: ["confirmNewPassword"],
});
type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

const SettingsPage: React.FC = () => {
  const { toast } = useToast();
  const { session, user } = useAuth(); 
  const { accentColor, setAccentColorState } = useTheme();
  const [currentLogoUrl, setCurrentLogoUrl] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [riotApiStatusMessage, setRiotApiStatusMessage] = useState<string | null>(null);
  const [isTestingRiotApi, setIsTestingRiotApi] = useState(false);
  const [isSavingRiotApiConfig, setIsSavingRiotApiConfig] = useState(false);
  const [riotApiKeyInput, setRiotApiKeyInput] = useState<string>("");
  const [platformIdInput, setPlatformIdInput] = useState<string>("NA1"); // Default to NA1
  const [isRiotApiKeySetInDb, setIsRiotApiKeySetInDb] = useState(false);

  const accentColorForm = useForm<AccentColorFormValues>({
    resolver: zodResolver(accentColorSchema),
    defaultValues: {
      accentColor: accentColor,
    },
  });

  const logoUploadForm = useForm<LogoUploadFormValues>({
    resolver: zodResolver(logoUploadSchema),
  });

  const changePasswordForm = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    },
  });

  useEffect(() => {
    const fetchRiotConfig = async () => {
      if (!session) return; // Only fetch if logged in
      try {
        console.log("Fetching Riot API configuration from DB...");
        const { data, error } = await supabase.functions.invoke('get-api-configuration', {
          body: { api_type: 'RIOT' },
        });

        console.log("get-api-configuration response:", { data, error });

        if (error) {
          // It's possible the user doesn't have rights (not admin/coach) or no config exists yet.
          // Don't show a scary error, just log it for devs.
          console.warn("Could not fetch Riot API configuration:", error.message);
          if (error.message.includes("Function not found")) {
            toast({ title: "Setup Incomplete", description: "API configuration function not deployed. Try again later.", variant: "default" });
          }
          // For other errors like permission denied, it's fine, they just won't see pre-filled data.
          return;
        }

        if (data) {
          if (data.platformId) {
            setPlatformIdInput(data.platformId);
            console.log("Platform ID set from DB:", data.platformId);
          }
          setIsRiotApiKeySetInDb(data.isApiKeySet);
          if (data.isApiKeySet) {
            console.log("Riot API key is configured in DB.");
            // No need to set riotApiKeyInput, as we don't fetch the actual key.
            // User will have to re-enter if they want to change it.
          }
        }
      } catch (err: any) {
        console.error("Exception fetching Riot API configuration:", err);
        // Don't show a toast for this kind of initial load error unless critical
      }
    };

    fetchRiotConfig();
  }, [session, toast]);

  useEffect(() => {
    accentColorForm.reset({ accentColor });
  }, [accentColor, accentColorForm]);

  useEffect(() => {
    if (user?.user_metadata?.team_logo_url) {
      // Ensure a unique URL to break cache if needed
      const logoUrlWithTimestamp = `${user.user_metadata.team_logo_url}${user.user_metadata.team_logo_url.includes('?') ? '&' : '?'}t=${new Date().getTime()}`;
      setCurrentLogoUrl(logoUrlWithTimestamp);
      console.log("SettingsPage: User metadata updated, new logo URL:", logoUrlWithTimestamp);
    } else {
      setCurrentLogoUrl(null);
    }
  }, [user]); // This useEffect will now correctly update currentLogoUrl when `user` from AuthContext changes

  function onSubmitAccentColor(data: AccentColorFormValues) {
    console.log("Accent color submitted:", data);
    setAccentColorState(data.accentColor);
    toast({
      title: "Appearance Updated",
      description: `Accent color set to ${data.accentColor}.`,
    });
  }

  async function onSubmitLogo(data: LogoUploadFormValues) {
    if (!session || !user) {
      toast({ title: "Authentication Error", description: "You must be logged in to upload a logo.", variant: "destructive" });
      return;
    }
    if (!data.logo || data.logo.length === 0) {
      toast({ title: "No File", description: "Please select a logo file to upload.", variant: "destructive" });
      return;
    }

    const file = data.logo[0];
    const fileExt = file.name.split('.').pop();
    // Use a unique name for the file to prevent caching issues if the user uploads a file with the same name
    const uniqueFileName = `logo_${new Date().getTime()}.${fileExt}`;
    const filePath = `${user.id}/${uniqueFileName}`;

    console.log(`Uploading logo to: team_logos/${filePath}`);
    setIsUploadingLogo(true);

    try {
      const { error: uploadError } = await supabase.storage
        .from('team_logos') // Corrected bucket name
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false, // Set to false to avoid overwriting if a file with the exact same path exists (though uniqueFileName helps)
        });

      if (uploadError) {
        console.error("Error uploading logo:", uploadError);
        toast({ title: "Logo Upload Failed", description: uploadError.message, variant: "destructive" });
        setIsUploadingLogo(false);
        return;
      }

      console.log("Logo uploaded successfully. Getting public URL...");

      const { data: publicUrlData } = supabase.storage
        .from('team_logos') // Corrected bucket name
        .getPublicUrl(filePath);

      if (!publicUrlData || !publicUrlData.publicUrl) {
        console.error("Error getting public URL for logo.");
        toast({ title: "Logo Uploaded", description: "Could not retrieve public URL. Please refresh.", variant: "default" });
      } else {
        const logoUrl = publicUrlData.publicUrl;
        console.log("Public URL:", logoUrl);

        // Update user metadata with the new logo URL.
        // The `onAuthStateChange` listener in AuthContext will pick up this change
        // and update the user object, which will then flow down to this component.
        const { error: updateUserError } = await supabase.auth.updateUser({
          data: { team_logo_url: logoUrl } // Store the simple URL; timestamp query param for display is handled by useEffect
        });

        if (updateUserError) {
          console.error("Error updating user metadata with logo URL:", updateUserError);
          toast({ title: "Logo Uploaded", description: "Logo uploaded but failed to save URL to profile.", variant: "default" });
        } else {
          toast({ title: "Logo Updated", description: `Team logo "${file.name}" uploaded successfully.` });
          // Optimistically update the displayed logo, or let the useEffect handle it
                          setCurrentLogoUrl(`${logoUrl}?t=${new Date().getTime()}`); // Optimistic update
          // Removed await refreshSession(); as it's not available and AuthContext handles updates.
          console.log("SettingsPage: User metadata update initiated for logo URL.");
        }
      }
    } catch (error: any) {
      console.error("Exception during logo upload process:", error);
      toast({ title: "Logo Upload Error", description: error.message || "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setIsUploadingLogo(false);
      logoUploadForm.reset(); // Reset the form fields
    }
  }

  function onSubmitChangePassword(data: ChangePasswordFormValues) {
    console.log("Change password submitted:", {
      currentPassword: data.currentPassword.substring(0,3) + "...",
      newPassword: data.newPassword.substring(0,3) + "...",
    });
    // Actual password change logic would go here, e.g., calling supabase.auth.updateUser
    // For now, just a toast message and form reset
    // Example:
    // const { error } = await supabase.auth.updateUser({ password: data.newPassword });
    // if (error) { toast({ title: "Password Change Failed", description: error.message, variant: "destructive" }); }
    // else { toast({ title: "Password Updated", description: "Your password has been changed successfully." }); }
    toast({
      title: "Password Change Requested (Not Implemented)",
      description: "Password change functionality is not fully implemented yet.",
    });
    changePasswordForm.reset();
  }

  const handleTestRiotApiConnection = async () => {
    if (!riotApiKeyInput.trim()) {
      setRiotApiStatusMessage("Please enter your Riot API Key to test the connection.");
      toast({
        title: "API Key Required",
        description: "Please enter your Riot API Key.",
        variant: "destructive",
      });
      return;
    }
    if (!platformIdInput.trim()) {
      setRiotApiStatusMessage("Please enter the Riot API Platform ID (e.g., NA1).");
      toast({
        title: "Platform ID Required",
        description: "Please enter the Riot API Platform ID.",
        variant: "destructive",
      });
      return;
    }

    setIsTestingRiotApi(true);
    setIsSavingRiotApiConfig(false);
    setRiotApiStatusMessage("Testing connection...");
    console.log("Attempting to invoke 'test-riot-api' Edge Function.");

    try {
      const { data: testData, error: testError } = await supabase.functions.invoke('test-riot-api', {
        body: { apiKey: riotApiKeyInput, platformId: platformIdInput },
      });
      console.log("'test-riot-api' response:", { testData, testError });

      if (testError) {
        console.error("'test-riot-api' invocation error:", testError.message);
        const errorMessage = testError.message.includes("Function not found")
          ? "Test function not found. Please wait and try again."
          : `Connection test failed: ${testError.message}`;
        setRiotApiStatusMessage(errorMessage);
        toast({ title: "Riot API Test Failed", description: errorMessage, variant: "destructive" });
      } else if (testData && testData.error) {
        console.error("Error from 'test-riot-api' logic:", testData.error, testData.details);
        const detailsString = testData.details ? ` (Details: ${typeof testData.details === 'object' ? JSON.stringify(testData.details) : testData.details})` : '';
        setRiotApiStatusMessage(`Connection test failed: ${testData.error}${detailsString}`);
        toast({ title: "Riot API Test Failed", description: `${testData.error}${detailsString}`, variant: "destructive" });
      } else if (testData && testData.success) {
        console.log("'test-riot-api' success:", testData.message);
        setRiotApiStatusMessage(`Test successful: ${testData.message} Now saving configuration...`);
        toast({ title: "Riot API Test Successful", description: testData.message });

        setIsSavingRiotApiConfig(true);
        try {
          console.log("Attempting to invoke 'set-api-configuration'.");
          const { data: saveData, error: saveError } = await supabase.functions.invoke('set-api-configuration', {
            body: {
              api_type: 'RIOT',
              apiKey: riotApiKeyInput,
              platformId: platformIdInput,
            },
          });
          console.log("'set-api-configuration' response:", { saveData, saveError });

          if (saveError) {
            console.error("'set-api-configuration' invocation error:", saveError.message);
            const saveErrorMessage = saveError.message.includes("Function not found")
              ? "Save function not found. Config not saved."
              : saveError.message.includes("Permission denied")
                ? "Permission denied. You might not have rights to save this configuration."
                : `Failed to save configuration: ${saveError.message}`;
            setRiotApiStatusMessage(`Test successful, but save failed: ${saveErrorMessage}`);
            toast({ title: "Save Failed", description: saveErrorMessage, variant: "destructive" });
          } else if (saveData && saveData.error) {
            console.error("Error from 'set-api-configuration' logic:", saveData.error, saveData.details);
            const saveDetailsString = saveData.details ? ` (Details: ${typeof saveData.details === 'object' ? JSON.stringify(saveData.details) : saveData.details})` : '';
            setRiotApiStatusMessage(`Test successful, but save failed: ${saveData.error}${saveDetailsString}`);
            toast({ title: "Save Failed", description: `${saveData.error}${saveDetailsString}`, variant: "destructive" });
          } else if (saveData && saveData.success) {
            console.log("'set-api-configuration' success:", saveData.message);
            const successMsg = `Riot API connection successful for ${platformIdInput}. Configuration saved.`;
            setRiotApiStatusMessage(successMsg);
            setIsRiotApiKeySetInDb(true);
            toast({ title: "Riot API Configured", description: successMsg });
          } else {
            setRiotApiStatusMessage("Test successful, but save failed: Unexpected response from server.");
            toast({ title: "Save Failed", description: "Unexpected response from save operation.", variant: "destructive" });
          }
        } catch (eSave: any) {
          console.error("Exception calling 'set-api-configuration':", eSave);
          setRiotApiStatusMessage(`Test successful, but save failed: ${eSave.message || "An unexpected error occurred during save."}`);
          toast({ title: "Save Failed", description: eSave.message || "An unexpected error occurred during save.", variant: "destructive" });
        } finally {
          setIsSavingRiotApiConfig(false);
        }
      } else {
        setRiotApiStatusMessage("Test failed: Unexpected response from server.");
        toast({ title: "Riot API Test Failed", description: "Unexpected response from test operation.", variant: "destructive" });
      }
    } catch (eTest: any) {
      console.error("Exception calling 'test-riot-api':", eTest);
      const errorMessage = eTest.message || "An unexpected error occurred during the test.";
      setRiotApiStatusMessage(`Connection test failed: ${errorMessage}`);
      toast({ title: "Riot API Test Failed", description: errorMessage, variant: "destructive" });
    } finally {
      setIsTestingRiotApi(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-8">
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>

        {/* Appearance Card */}
        <Card className="scrim-card">
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>Customize the look and feel of ScrimStats Pro.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <Label htmlFor="theme" className="text-base text-foreground">Theme</Label>
              <ThemeToggle />
            </div>

            <Form {...accentColorForm}>
              <form onSubmit={accentColorForm.handleSubmit(onSubmitAccentColor)} className="space-y-4">
                <FormField
                  control={accentColorForm.control}
                  name="accentColor"
                  render={({ field }) => (
                    <FormItem>
                      <ShadcnFormLabel htmlFor="accentColor" className="text-foreground">Accent Color</ShadcnFormLabel>
                      <div className="flex items-center gap-2">
                        <FormControl>
                          <Input id="accentColor" type="color" {...field} className="w-24 h-10 p-1" />
                        </FormControl>
                        <Input 
                            type="text" 
                            value={field.value} 
                            onChange={field.onChange} 
                            className="w-32"
                            placeholder="#RRGGBB"
                        />
                      </div>
                      <FormDescription className="text-muted-foreground">
                        Updates the primary color used throughout the app.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" variant="outline" disabled={accentColorForm.formState.isSubmitting}>
                  {accentColorForm.formState.isSubmitting ? "Saving..." : "Save Accent Color"}
                </Button>
              </form>
            </Form>

            <Form {...logoUploadForm}>
              <form onSubmit={logoUploadForm.handleSubmit(onSubmitLogo)} className="space-y-4">
                <FormField
                  control={logoUploadForm.control}
                  name="logo"
                  render={({ field: { onChange, value, ...restField } }) => ( 
                    <FormItem>
                      <div className="flex items-center gap-4 mb-2">
                        <ShadcnFormLabel htmlFor="logoUpload" className="text-foreground">Team Logo</ShadcnFormLabel>
                        {currentLogoUrl && (
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={currentLogoUrl} alt="Team Logo" />
                            <AvatarFallback>LOGO</AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                      <FormControl>
                        <Input 
                          id="logoUpload" 
                          type="file" 
                          accept="image/jpeg,image/png,image/gif,image/svg+xml"
                          onChange={(e) => onChange(e.target.files)} 
                          {...restField} 
                        />
                      </FormControl>
                      <FormDescription className="text-muted-foreground">
                        Upload your team's logo (max 5MB). It will be displayed in the sidebar/header (eventually).
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" variant="outline" disabled={logoUploadForm.formState.isSubmitting || isUploadingLogo}>
                  {isUploadingLogo ? "Uploading..." : logoUploadForm.formState.isSubmitting ? "Preparing..." : "Upload Logo"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* API Configuration Card */}
        <Card className="scrim-card">
          <CardHeader>
            <CardTitle>API Configuration</CardTitle>
            <CardDescription>Manage connections to external APIs and generate tokens for application integrations.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Riot API Section */}
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-3 border-b pb-2">Riot API</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="riotApiKey" className="text-foreground">Your Riot API Key</Label>
                   {isRiotApiKeySetInDb && (
                    <p className="text-xs text-green-600 mt-1">
                      An API key is currently configured. Enter a new key to update it.
                    </p>
                  )}
                  <Input
                    id="riotApiKey"
                    type="password"
                    placeholder="Enter your Riot API Key"
                    value={riotApiKeyInput}
                    onChange={(e) => setRiotApiKeyInput(e.target.value)}
                    className="bg-input mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="riotApiPlatformId" className="text-foreground">Riot API Platform ID</Label>
                  <Input
                    id="riotApiPlatformId"
                    type="text"
                    placeholder="e.g., NA1, EUW1, KR"
                    value={platformIdInput}
                    onChange={(e) => setPlatformIdInput(e.target.value.toUpperCase())}
                    className="bg-input mt-1"
                  />
                   <p className="text-xs text-muted-foreground mt-1">
                    Enter the region for the Riot API (e.g., NA1, EUW1, EUN1, KR, JP1).
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Your API key and Platform ID will be saved securely in the database upon a successful test.
                  Only users with 'admin' or 'coach' roles can save this configuration.
                </p>
              </div>
              <Button 
                variant="outline" 
                onClick={handleTestRiotApiConnection} 
                disabled={isTestingRiotApi || isSavingRiotApiConfig || !session} // Disable if not logged in
                className="mt-4"
              >
                {isTestingRiotApi ? "Testing..." : isSavingRiotApiConfig ? "Saving..." : "Test Connection & Save"}
              </Button>
              {riotApiStatusMessage && (
                <p className={`mt-2 text-sm ${riotApiStatusMessage.includes("Success") || riotApiStatusMessage.includes("saved") ? "text-green-600" : "text-red-600"}`}>
                  {riotApiStatusMessage}
                </p>
              )}
            </div>

            {/* GRID API Section (Placeholder) */}
            <div className="mt-6 border-t border-border pt-6">
              <h3 className="text-lg font-semibold text-foreground mb-3 border-b pb-2">GRID API (Placeholder)</h3>
              <Button variant="outline" disabled>Connect GRID API</Button>
               <p className="text-xs text-muted-foreground mt-1">
                GRID API integration will be configured here in the future.
              </p>
            </div>

            {/* Desktop Application API Token Section */}
            <div className="mt-6 border-t border-border pt-6">
              <h3 className="text-lg font-semibold text-foreground mb-3 border-b pb-2">Desktop Application API Token</h3>
              <ApiTokenManager />
            </div>

             <p className="text-muted-foreground mt-4 text-sm">
              API keys and tokens are stored securely and managed by users with appropriate permissions.
            </p>
          </CardContent>
        </Card>

        {/* Account Card */}
        <Card className="scrim-card">
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">Email</Label>
                <Input id="email" type="email" defaultValue={session?.user?.email || "coach@example.com"} readOnly className="bg-input" />
            </div>
            
            <Form {...changePasswordForm}>
              <form onSubmit={changePasswordForm.handleSubmit(onSubmitChangePassword)} className="space-y-4 border-t border-border pt-6 mt-6">
                <h3 className="text-lg font-medium text-foreground">Change Password</h3>
                <FormField
                  control={changePasswordForm.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <ShadcnFormLabel className="text-foreground">Current Password</ShadcnFormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} className="bg-input" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={changePasswordForm.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <ShadcnFormLabel className="text-foreground">New Password</ShadcnFormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} className="bg-input" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={changePasswordForm.control}
                  name="confirmNewPassword"
                  render={({ field }) => (
                    <FormItem>
                      <ShadcnFormLabel className="text-foreground">Confirm New Password</ShadcnFormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} className="bg-input" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" variant="destructive" disabled={changePasswordForm.formState.isSubmitting || !session}>
                  {changePasswordForm.formState.isSubmitting ? "Updating..." : "Update Password"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default SettingsPage;
