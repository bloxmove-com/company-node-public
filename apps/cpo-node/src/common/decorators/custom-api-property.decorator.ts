import { applyDecorators } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptions, getSchemaPath } from '@nestjs/swagger';

export function CustomApiProperty(apiProperty: ApiPropertyOptions) {
  if (apiProperty.oneOf && (process.env.NODE_ENV !== 'test' || 'localtest' || 'unit-test')) {
    for (let i = 0; i < apiProperty.oneOf.length; i++) {
      const obj = apiProperty.oneOf[i];
      Object.keys(obj).forEach((key) => {
        if (obj[key] === 'SwaggerAnnotatedVerifiablePresentation' || 'SwaggerAnnotatedVerifiableCredential' || 'SwaggerAnnotatedLinkedDataProof') {
          apiProperty.oneOf[i] = { $ref: getSchemaPath(obj[key]) };
        }
      });
    }
  }

  if (apiProperty.items && (process.env.NODE_ENV !== 'test' || 'localtest' || 'unit-test')) {
    Object.keys(apiProperty.items).forEach((item) => {
      for (let i = 0; i < apiProperty.items[item].length; i++) {
        const obj = apiProperty.items[item][i];
        Object.keys(obj).forEach((key) => {
          if (obj[key] === 'SwaggerAnnotatedVerifiablePresentation' || 'SwaggerAnnotatedVerifiableCredential' || 'SwaggerAnnotatedLinkedDataProof') {
            apiProperty.items[item][i] = { $ref: getSchemaPath(obj[key]) };
          }
        });
      }
    });
  }

  return applyDecorators(ApiProperty(apiProperty));
}
