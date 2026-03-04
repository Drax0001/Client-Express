"use client";

import * as React from "react";
import {
  useForm,
  UseFormProps,
  FieldValues,
  UseFormReturn,
  FormProvider,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

interface FormProps<T extends FieldValues = any>
  extends Omit<React.FormHTMLAttributes<HTMLFormElement>, "onSubmit"> {
  form: UseFormReturn<T>;
  onSubmit: (data: T) => void | Promise<void>;
  schema?: z.ZodSchema<T>;
}

export function Form<T extends FieldValues = any>({
  form,
  onSubmit,
  schema,
  children,
  ...props
}: FormProps<T>) {
  const handleSubmit = form.handleSubmit(onSubmit);

  return (
    <FormProvider {...form}>
      <form onSubmit={handleSubmit} {...props}>
        {children}
      </form>
    </FormProvider>
  );
}

export function useFormWithValidation<T extends FieldValues>(
  schema: z.ZodSchema<T>,
  options?: Omit<UseFormProps<T>, "resolver">
) {
  return useForm<T>({
    ...options,
    resolver: zodResolver(schema as any) as any,
  });
}
