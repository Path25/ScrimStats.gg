import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import ThemeToggle from '@/components/ThemeToggle';
import { NavLink } from 'react-router-dom';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/contexts/AuthContext';

// Define Zod schema for login form
const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const LoginPage: React.FC = () => {
  const { toast } = useToast();
  const { login, authLoading } = useAuth(); // authLoading comes from the updated AuthContext
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(data: LoginFormValues) {
    setSubmitError(null);
    console.log("LoginPage (Supabase): onSubmit called with data:", data);
    
    // The login function now returns { error: AuthError | null }
    const { error } = await login({ email: data.email, password: data.password });

    if (error) {
      console.error("LoginPage (Supabase): Login error:", error.message);
      // error.message is available on AuthError
      setSubmitError(error.message || "Login failed. Please check your credentials.");
      toast({
        title: "Login Failed",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } else {
      console.log("LoginPage (Supabase): Login successful. AuthContext & AppRoutes will handle redirect.");
      toast({
        title: "Login Successful",
        description: "Redirecting to dashboard...",
      });
      // Navigation is handled by AppRoutes/ProtectedRoute based on session state from AuthContext
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-md shadow-soft-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-primary">ScrimStats.gg</CardTitle>
          <CardDescription>Log in to manage your team's scrims</CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <CardContent className="space-y-4">
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
              {submitError && <p className="text-sm font-medium text-destructive">{submitError}</p>}
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button 
                type="submit" 
                className="w-full" 
                disabled={form.formState.isSubmitting || authLoading} // authLoading from context
              >
                {authLoading ? "Logging in..." : "Log In"}
              </Button>
              <p className="text-sm text-muted-foreground text-center">
                Don't have an account? <NavLink to="/register" className="text-primary hover:underline">Register here</NavLink>
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

export default LoginPage;
