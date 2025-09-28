import Joi from 'joi';
import { AppError } from '../middleware/errorHandler';

const agentSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  type: Joi.string().valid('dify', 'fastgpt').default('dify'),
  url: Joi.string().uri().required(),
  apiToken: Joi.string().min(1).required(),
  isActive: Joi.boolean().optional()
});

export const validateAgentInput = (data: any) => {
  // Strip unknown fields before validation
  const { error, value } = agentSchema.validate(data, {
    stripUnknown: true,
    abortEarly: false
  });

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