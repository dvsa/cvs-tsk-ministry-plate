import {Injector} from "../../src/models/injector/Injector";
import {PlateGenerationService} from "../../src/services/PlateGenerationService";
import {S3BucketMockService} from "../models/S3BucketMockService";
import {LambdaMockService} from "../models/LambdaMockService";
import event from "../resources/queue-event.json";
import {IGeneratedCertificateResponse, ITechRecordWrapper} from "../../src/models";
import {CertificateUploadService} from "../../src/services/CertificateUploadService";
import {ManagedUpload} from "aws-sdk/clients/s3";

describe("CertificateUploadService", () => {
    LambdaMockService.populateFunctions();

    context("when a valid event is received", () => {
        const vehicle: ITechRecordWrapper = JSON.parse(event.Records[0].body);
        const certificateUploadService: CertificateUploadService = Injector.resolve<CertificateUploadService>(CertificateUploadService, [S3BucketMockService]);
        const plateGenerationService: PlateGenerationService = Injector.resolve<PlateGenerationService>(PlateGenerationService, [S3BucketMockService, LambdaMockService]);

        context("when uploading a certificate", () => {
            context("and the S3 bucket exists and is accessible", () => {
                it("should successfully upload the certificate", async () => {
                    const generatedCertificateResponse: IGeneratedCertificateResponse = await plateGenerationService.generateCertificate(vehicle);
                    S3BucketMockService.buckets.push({
                        bucketName: `cvs-cert-${process.env.BUCKET}`,
                        files: []
                    });

                    return certificateUploadService.uploadCertificate(generatedCertificateResponse)
                        .then((response: ManagedUpload.SendData) => {
                            expect(response.Key).toEqual(`${process.env.BRANCH}/${generatedCertificateResponse.fileName}`);

                            S3BucketMockService.buckets.pop();
                        });
                });
            });

            context("and the S3 bucket does not exist or is not accessible", () => {
                it("should throw an error", async () => {
                    const generatedCertificateResponse: IGeneratedCertificateResponse = await plateGenerationService.generateCertificate(vehicle);
                    expect.assertions(1);
                    return certificateUploadService.uploadCertificate(generatedCertificateResponse)
                        .catch((error: any) => {
                            expect(error).toBeInstanceOf(Error);
                        });
                });
            });
        });
    });
});
