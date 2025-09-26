import Joi from 'joi';
import { AppError } from '../middleware/errorHandler';

const taskSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  promptTemplate: Joi.string().min(1).max(10000).required()
});

export const validateTaskInput = (data: any) => {
  const { error, value } = taskSchema.validate(data);

  if (error) {
    throw new AppError(
      `Validation error: ${error.details[0].message}`,
      400,
      true,
      error.details
    );
  }

  return value;
};

export const extractPlaceholders = (template: string): string[] => {
  // Extract all placeholders in format {placeholder_name}
  const regex = /\{([^}]+)\}/g;
  const placeholders: string[] = [];
  let match;

  while ((match = regex.exec(template)) !== null) {
    const placeholder = match[1].trim();
    if (placeholder && !placeholders.includes(placeholder)) {
      placeholders.push(placeholder);
    }
  }

  // Always include these standard placeholders if found
  const standardPlaceholders = ['input_text', 'file_content'];

  return placeholders.filter(p =>
    standardPlaceholders.includes(p) || !standardPlaceholders.includes(p)
  );
};

export const replacePlaceholders = (
  template: string,
  values: Record<string, string>
): string => {
  let result = template;

  Object.entries(values).forEach(([key, value]) => {
    const placeholder = `{${key}}`;
    result = result.replace(new RegExp(placeholder, 'g'), value);
  });

  return result;
};