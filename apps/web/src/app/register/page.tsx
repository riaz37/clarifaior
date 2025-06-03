"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import { Spinner } from "@repo/ui/spinner";
import { AuthLayout } from "../../components/auth/auth-layout";
import { Eye, EyeOff, Mail, Lock, User, Building } from "lucide-react";
import { useAuth } from "../../lib/auth-guard";
import { useErrorHandler } from "../../lib/error-handler";
import {
  registerSchema,
  type RegisterForm,
} from "@/validations/auth-validations";

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser } = useAuth();
  const { handleError } = useErrorHandler();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    mode: "onChange",
  });

  const onSubmit = async (data: RegisterForm) => {
    setIsLoading(true);
    try {
      await registerUser({
        name: data.name,
        email: data.email,
        password: data.password,
        workspaceName: data.workspaceName,
      });
      toast.success("Account created successfully! Welcome to Clarifaior.");
      router.push("/dashboard");
    } catch (error) {
      const appError = handleError(error, { context: "register" });
      toast.error(appError.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create Your Account"
      description="Join thousands of developers building AI agents with Clarifaior"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Name Field */}
        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium text-gray-200">
            Full Name
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              id="name"
              type="text"
              placeholder="Enter your full name"
              variant="ai"
              className="pl-10"
              {...register("name")}
            />
          </div>
          {errors.name && (
            <p className="text-red-400 text-sm">{errors.name.message}</p>
          )}
        </div>

        {/* Email Field */}
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium text-gray-200">
            Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              variant="ai"
              className="pl-10"
              {...register("email")}
            />
          </div>
          {errors.email && (
            <p className="text-red-400 text-sm">{errors.email.message}</p>
          )}
        </div>

        {/* Workspace Name Field */}
        <div className="space-y-2">
          <label
            htmlFor="workspaceName"
            className="text-sm font-medium text-gray-200"
          >
            Workspace Name
          </label>
          <div className="relative">
            <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              id="workspaceName"
              type="text"
              placeholder="e.g., Acme Corp, My Team"
              variant="ai"
              className="pl-10"
              {...register("workspaceName")}
            />
          </div>
          {errors.workspaceName && (
            <p className="text-red-400 text-sm">
              {errors.workspaceName.message}
            </p>
          )}
        </div>

        {/* Password Field */}
        <div className="space-y-2">
          <label
            htmlFor="password"
            className="text-sm font-medium text-gray-200"
          >
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Create a strong password"
              variant="ai"
              className="pl-10 pr-10"
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="text-red-400 text-sm">{errors.password.message}</p>
          )}
        </div>

        {/* Confirm Password Field */}
        <div className="space-y-2">
          <label
            htmlFor="confirmPassword"
            className="text-sm font-medium text-gray-200"
          >
            Confirm Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm your password"
              variant="ai"
              className="pl-10 pr-10"
              {...register("confirmPassword")}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
            >
              {showConfirmPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-red-400 text-sm">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        {/* Terms Agreement */}
        <div className="flex items-start space-x-2">
          <input
            id="agreeToTerms"
            type="checkbox"
            className="h-4 w-4 mt-1 rounded border-gray-600 bg-gray-700 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-gray-800"
            {...register("agreeToTerms")}
          />
          <label htmlFor="agreeToTerms" className="text-sm text-gray-300">
            I agree to the{" "}
            <Link href="/terms" className="text-cyan-400 hover:text-cyan-300">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-cyan-400 hover:text-cyan-300">
              Privacy Policy
            </Link>
          </label>
        </div>
        {errors.agreeToTerms && (
          <p className="text-red-400 text-sm">{errors.agreeToTerms.message}</p>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          variant="ai"
          size="lg"
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Spinner size="sm" variant="ai" className="mr-2" />
              Creating Account...
            </>
          ) : (
            "Create Account"
          )}
        </Button>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-600" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-gray-900/50 text-gray-400">
              Or continue with
            </span>
          </div>
        </div>

        {/* OAuth Buttons */}
        <div className="space-y-3">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full border-white/20 text-white hover:bg-white/10"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </Button>

          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full border-white/20 text-white hover:bg-white/10"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            Continue with GitHub
          </Button>
        </div>

        {/* Sign In Link */}
        <div className="text-center">
          <p className="text-gray-400">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-cyan-400 hover:text-cyan-300 transition-colors font-medium"
            >
              Sign in
            </Link>
          </p>
        </div>
      </form>
    </AuthLayout>
  );
}
