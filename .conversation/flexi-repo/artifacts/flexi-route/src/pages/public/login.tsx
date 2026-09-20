import React, { useState } from 'react';
import { useLocation, Link } from 'wouter';
import { useLogin, useGetMe } from '@workspace/api-client-react';
import { useAuth } from '@/lib/auth';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Package, Lock, Mail, Loader2 } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const { login: setAuthContext } = useAuth();
  
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const fillAdmin = () => {
    form.setValue('email', 'nkingsley130@gmail.com');
    form.setValue('password', 'admin134');
  };

  const loginMutation = useLogin();

  const onSubmit = async (data: LoginFormValues) => {
    try {
      const res = await loginMutation.mutateAsync({ data });
      setAuthContext(res.token, res.user);
      
      toast.success("Welcome back!");
      
      // Redirect based on role
      if (res.user.role === 'admin') setLocation('/admin');
      else if (res.user.role === 'driver') setLocation('/driver');
      else setLocation('/dashboard');
      
    } catch (err: any) {
      toast.error(err?.data?.error || "Invalid credentials. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="bg-primary p-2 rounded-lg text-white">
              <Package className="h-6 w-6" />
            </div>
            <span className="text-2xl font-bold text-secondary">Flexi Route</span>
          </Link>
          <h2 className="text-3xl font-extrabold text-secondary">Sign in to your account</h2>
          <p className="mt-2 text-gray-600">
            Or <Link href="/register" className="text-primary font-medium hover:underline">create a new account</Link>
          </p>
        </div>

        <div className="bg-white py-8 px-4 shadow-xl shadow-black/5 rounded-2xl sm:px-10 border border-gray-100">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email address</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <Input 
                          placeholder="you@company.com" 
                          className="pl-10 h-12" 
                          autoComplete="email"
                          data-testid="input-login-email"
                          {...field} 
                        />
                      </div>
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
                    <div className="flex items-center justify-between">
                      <FormLabel>Password</FormLabel>
                      <Link href="#" className="text-sm font-medium text-primary hover:underline">
                        Forgot password?
                      </Link>
                    </div>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <Input 
                          type="password" 
                          placeholder="••••••••" 
                          className="pl-10 h-12" 
                          autoComplete="current-password"
                          data-testid="input-login-password"
                          {...field} 
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="w-full h-12 text-lg font-semibold" 
                disabled={loginMutation.isPending}
                data-testid="button-login-submit"
              >
                {loginMutation.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                ) : null}
                Sign in
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
