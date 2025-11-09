import * as React from "react";
import type { FieldPath, FieldValues } from "react-hook-form";

// Общие контексты формы, вынесены в .ts для соответствия правилу only-export-components
export type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = {
  name: TName;
};

export const FormFieldContext = React.createContext<FormFieldContextValue>({} as FormFieldContextValue);

export type FormItemContextValue = {
  id: string;
};

export const FormItemContext = React.createContext<FormItemContextValue>({} as FormItemContextValue);