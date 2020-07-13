import {Callback, Context, Handler, SQSEvent, SQSRecord} from "aws-lambda";
import {PlateGenerationService} from "../services/PlateGenerationService";
import {Injector} from "../models/injector/Injector";
import {CertificateUploadService} from "../services/CertificateUploadService";
import {ManagedUpload} from "aws-sdk/clients/s3";
import {IGeneratedCertificateResponse} from "../models";

/**
 * λ function to process an SQS message detailing info for certificate generation
 * @param event - DynamoDB Stream event
 * @param context - λ Context
 * @param callback - callback function
 */
const ministryPlateGen: Handler = async (event: SQSEvent, context?: Context, callback?: Callback): Promise<any> => {
    console.log("EVENT RECEIVED", JSON.stringify(event));
    if (!event || !event.Records || !Array.isArray(event.Records) || !event.Records.length) {
        console.error("ERROR: event is not defined.");
        throw new Error("Event is empty");
    }

    const plateGenerationService: PlateGenerationService = Injector.resolve<PlateGenerationService>(PlateGenerationService);
    const certificateUploadService: CertificateUploadService = Injector.resolve<CertificateUploadService>(CertificateUploadService);
    const certificateUploadPromises: Array<Promise<ManagedUpload.SendData>> = [];

    event.Records.forEach((record: SQSRecord) => {
        const techRecord: any = JSON.parse(record.body);
        const generatedCertificateResponse: Promise<ManagedUpload.SendData> = plateGenerationService.generateCertificate(techRecord)
            .then((response: IGeneratedCertificateResponse) => {
                return certificateUploadService.uploadCertificate(response);
            });

        certificateUploadPromises.push(generatedCertificateResponse);
    });

    return Promise.all(certificateUploadPromises)
        .catch((error: Error) => {
            console.error(error);
            console.log("Records", event.Records);
            throw error;
        });
};

export {ministryPlateGen};
