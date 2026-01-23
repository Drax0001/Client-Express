"use client";

import * as React from "react";
import { Controller, useFormContext } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Input, InputProps } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface FormFieldProps extends Omit<InputProps, "name"> {
  name: string;
  label?: string;
  required?: boolean;
}

export const FormField = React.forwardRef<HTMLInputElement, FormFieldProps>(
  ({ name, label, required, className, ...props }, ref) => {
    const { control, formState: { errors } } = useFormContext();
    const error = errors[name];

    return (
      <div className="space-y-2">
        {label && (
          <Label htmlFor={name}>
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </Label>
        )}
        <Controller
          name={name}
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              id={name}
              ref={ref}
              className={cn(
                error && "border-destructive focus-visible:ring-destructive",
                className
              )}
              {...props}
            />
          )}
        />
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error.message}
          </p>
        )}
      </div>
    );
  }
);

FormField.displayName = "FormField";
