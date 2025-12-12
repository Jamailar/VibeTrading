export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}
export declare function validateStrategyCode(code: string): ValidationResult;
