import { ApiProperty } from '@nestjs/swagger';
import { ServicePackage } from './service-package.class';

export class ServiceCatalog {
  constructor(vehicleDID: string, servicePackages: ServicePackage[]) {
    this.vehicleDID = vehicleDID;
    this.servicePackages = servicePackages;
  }

  @ApiProperty({
    example: 'did:ethr:blxm-uat:0x58737f36e3b9e0008769bd004e62ec3d5160ef8eea45274d4b2bd3f513837748',
    type: 'string',
    description: 'The DID of the vehicle',
  })
  vehicleDID: string;

  @ApiProperty({ type: [ServicePackage], description: 'Service packages associated with the vehicleDID' })
  servicePackages: ServicePackage[];
}
