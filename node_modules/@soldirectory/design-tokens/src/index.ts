import tokensJson from './tokens.json';

export interface DesignTokens {
  color: Record<string, unknown>;
  gradient: Record<string, string>;
  radius: Record<string, string>;
  shadow: Record<string, string>;
  type: Record<string, unknown>;
  size: Record<string, string>;
  layout: Record<string, unknown>;
  motion: Record<string, string>;
}

export const tokens = tokensJson as unknown as DesignTokens;

export default tokens;
