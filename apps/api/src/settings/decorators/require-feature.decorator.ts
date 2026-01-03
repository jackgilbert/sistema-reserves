import { SetMetadata } from '@nestjs/common';

export const FEATURE_KEY = 'feature';

/**
 * Decorator para requerir una feature habilitada
 * Uso: @RequireFeature('bookings.enabled')
 */
export const RequireFeature = (featurePath: string) => SetMetadata(FEATURE_KEY, featurePath);
