import { z } from "zod";

export const emailValidation = z
  .string()
  .min(1, { message: "Email is required" })
  .email({ message: "Please provide a valid email address" });

export const passwordValidation = z
  .string()
  .min(1, { message: "Password is required" })
  .min(8, { message: "Password must be at least 8 characters long" })
  .regex(/(?=.*[a-z])/, {
    message: "Must contain at least one lowercase letter",
  })
  .regex(/(?=.*[A-Z])/, {
    message: "Must contain at least one uppercase letter",
  })
  .regex(/(?=.*\d)/, { message: "Must contain at least one number" })
  .regex(/(?=.*[^\w\s])/, {
    message: "Must contain at least one special character",
  });

export const nameValidation = z
  .string()
  .min(1, { message: "Name is required" })
  .min(2, { message: "Name must be at least 2 characters long" })
  .regex(/^[a-zA-Z\s'-]+$/, {
    message: "Name can only contain letters, spaces, hyphens, and apostrophes",
  });

export const workspaceNameValidation = z
  .string()
  .min(1, { message: "Workspace name is required" })
  .min(2, { message: "Workspace name must be at least 2 characters" });

export const termsValidation = z
  .boolean({
    required_error: "You must agree to the terms and conditions",
  })
  .refine((val) => val === true, {
    message: "You must agree to the terms and conditions",
  });
