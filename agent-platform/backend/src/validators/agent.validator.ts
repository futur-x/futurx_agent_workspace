import Joi from 'joi';
import { AppError } from '../middleware/errorHandler';

const agentSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  url: Joi.string().uri().required(),
  apiToken: Joi.string().min(1).required(),
  isActive: Joi.boolean().optional()
});

export const validateAgentInput = (data: any) => {
  const { error, value } = agentSchema.validate(data);

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