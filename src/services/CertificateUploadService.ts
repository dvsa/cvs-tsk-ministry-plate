import {Service} from "../models/injector/ServiceDecorator";
import {S3BucketService} from "./S3BucketService";
import {IGeneratedCertificateResponse} from "../models";
import {ManagedUpload, Metadata} from "aws-sdk/clients/s3";

/**
 * Service class for uploading certificates to S3
 */
@Service()
class CertificateUploadService {
    private readonly s3BucketService: S3BucketService;

    constructor(s3BucketService: S3BucketService) {
        this.s3BucketService = s3BucketService;
    }

    /**
     * Uploads a generated plate certificate to S3 bucket
     * @param payload
     */
    public uploadCertificate(payload: IGeneratedCertificateResponse): Promise<ManagedUpload.SendData> {
        const metadata: Metadata = {
            "vrm": payload.vrm,
            "vin": payload.vin,
            "date-of-issue": payload.dateOfIssue,
            "cert-type": payload.certificateType,
            "file-format": payload.fileFormat,
            "file-size": payload.fileSize,
            "email": payload.email
        };

        return this.s3BucketService.upload(`cvs-cert-${process.env.BUCKET}`, payload.fileName, payload.certificate, metadata);
    }

}

export { CertificateUploadService };
