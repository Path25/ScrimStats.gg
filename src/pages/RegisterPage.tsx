import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import ThemeToggle from '@/components/ThemeToggle';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/contexts/AuthContext'; // Will use the Supabase-integrated AuthContext

// Define Zod schema for registration form
const registerSchema = z.object({
  fullName: z.string().min(1, { message: "Full name is required." }),
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(8, { message: "Password must be at least 8 characters." }),
  confirmPassword: z.string().min(8, { message: "Please confirm your password." }),
  ign: z.string().optional(), // Optional In-Game Name
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

const RegisterPage: React.FC = () => {
  const { toast } = useToast();
  const { signUp, authLoading } = useAuth(); // authLoading from updated AuthContext
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      ign: "",
    },
  });

  async function onSubmit(data: RegisterFormValues) {
    setSubmitError(null);
    console.log("RegisterPage (Supabase): onSubmit called with data:", data);
    
    // The signUp function now takes data for Supabase options and returns { error: AuthError | null, data: { user, session } }
    const { error, data: signUpData } = await signUp({
      email: data.email,
      password: data.password,
      data: { // This structure is for Supabase options.data
        full_name: data.fullName,
        ign: data.ign || null, // Ensure ign is null if empty string, or handle as per db schema
      }
    });

    if (error) {
      console.error("RegisterPage (Supabase): Registration error:", error.message);
      setSubmitError(error.message || "Registration failed. Please try again.");
      toast({
        title: "Registration Failed",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } else {
      // signUpData.user and signUpData.session are now Supabase User and Session types
      console.log("RegisterPage (Supabase): Registration API call successful. signUpData:", signUpData);
      // The message about email confirmation is still relevant if enabled in Supabase
      toast({
        title: "Registration Submitted!",
        description: "If email confirmation is required, please check your email. Then you can log in.",
      });
      // Navigate to login after a delay, user might need to confirm email first.
      setTimeout(() => navigate('/login'), 2500); 
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-md shadow-soft-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-primary">Create Account</CardTitle>
          <CardDescription>Join ScrimStats.gg to manage your team</CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input type="text" placeholder="Your Name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="ign"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>In-Game Name (Optional)</FormLabel>
                    <FormControl>
                      <Input type="text" placeholder="YourSummonerName" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="coach@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {submitError && <p className="text-sm font-medium text-destructive">{submitError}</p>}
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button 
                type="submit" 
                className="w-full" 
                disabled={form.formState.isSubmitting || authLoading} // authLoading from context
              >
                {authLoading ? "Registering..." : "Register"}
              </Button>
              <p className="text-sm text-muted-foreground text-center">
                Already have an account? <NavLink to="/login" className="text-primary hover:underline">Log in here</NavLink>
              </p>
            </CardFooter>
          </form>
        </Form>
      </Card>
      <p className="mt-8 text-sm text-muted-foreground">
        © {new Date().getFullYear()} ScrimStats.gg. For demo purposes.
      </p>
    </div>
  );
};

export default RegisterPage;
