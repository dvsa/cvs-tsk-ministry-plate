import {Configuration} from "../utils/Configuration";
import {S3BucketService} from "./S3BucketService";
import {AWSError, config as AWSConfig, Lambda} from "aws-sdk";
import {Service} from "../models/injector/ServiceDecorator";
import {LambdaService} from "./LambdaService";
import moment from "moment";
import {
    ICertificatePayload,
    IGeneratedCertificateResponse,
    IInvokeConfig,
    IMOTConfig,
    ITechRecord,
    ITechRecordWrapper
} from "../models";
import {PromiseResult} from "aws-sdk/lib/request";
import {VEHICLE_TYPES} from "../models/Enums";

/**
 * Service class for Plate Generation
 */
@Service()
class PlateGenerationService {
    private readonly s3Client: S3BucketService;
    private readonly config: Configuration;
    private readonly lambdaClient: LambdaService;

    constructor(s3Client: S3BucketService, lambdaClient: LambdaService) {
        this.s3Client = s3Client;
        this.config = Configuration.getInstance();
        this.lambdaClient = lambdaClient;

        AWSConfig.lambda = this.config.getInvokeConfig().params;
    }

    /**
     * Generates Plates certificate for a given tech record
     * @param vehicle - source tech record for plate generation
     */
    public async generateCertificate(vehicle: ITechRecordWrapper): Promise<IGeneratedCertificateResponse> {
        const config: IMOTConfig = this.config.getMOTConfig();
        const iConfig: IInvokeConfig = this.config.getInvokeConfig();
        const techRecord: ITechRecord = vehicle.techRecord[0];
        const platePayload: string = JSON.stringify(await this.generatePayload(vehicle));
        console.log("STRING PAYLOAD", platePayload);

        const invokeParams: any = {
            FunctionName: iConfig.functions.plateGen.name,
            InvocationType: "RequestResponse",
            LogType: "Tail",
            Payload: JSON.stringify({
                httpMethod: "POST",
                pathParameters: {
                    documentName: config.documentNames.vtg6_vtg7,
                    documentDirectory: config.documentDir
                },
                json: true,
                body: platePayload
            }),
        };

        return this.lambdaClient.invoke(invokeParams)
            .then((response: PromiseResult<Lambda.Types.InvocationResponse, AWSError>) => {
                const payload: any = this.lambdaClient.validateInvocationResponse(response);
                const resBody: string = payload.body;
                const responseBuffer: Buffer = Buffer.from(resBody, "base64");
                return {
                    vin: vehicle.vin,
                    vrm: vehicle.primaryVrm ? vehicle.primaryVrm : vehicle.trailerId,
                    dateOfIssue: moment(techRecord.plates.plateIssueDate).format("DD MMMM YYYY"),
                    certificateType: config.documentNames.vtg6_vtg7.split(".")[0],
                    fileFormat: "pdf",
                    fileName: `${vehicle.vin}_${techRecord.plates.plateSerialNumber}.pdf`,
                    fileSize: responseBuffer.byteLength.toString(),
                    certificate: responseBuffer,
                    email: techRecord.plates.toEmailAddress
                };
            })
            .catch((error: AWSError | Error) => {
                console.error(error);
                throw error;
            });

    }

    /**
     * Generates the payload for the MOT certificate generation service
     * @param vehicle - source tech record for plate generation
     */
    public async generatePayload(vehicle: ITechRecordWrapper) {
        let payload: ICertificatePayload = {
            Watermark: (process.env.BRANCH === "prod") ? "" : "NOT VALID",
            PLATES_DATA: undefined
        };
        const platesData = this.generateCertificateData(vehicle);
        payload.PLATES_DATA = platesData;

        // Purge undefined values
        payload = JSON.parse(JSON.stringify(payload));
        return payload;
    }

    /**
     * Generates plates data for a given vehicle
     * @param vehicle - the source vehicle for plates generation
     */
    private generateCertificateData(vehicle: ITechRecordWrapper) {
        const techRecord: ITechRecord = vehicle.techRecord[0];
        const platePayload = {
            PlateSerialNumber: techRecord.plates.plateSerialNumber,
            DtpNumber: techRecord.brakes.dtpNumber,
            PrimaryVrm: vehicle.primaryVrm,
            Vin: vehicle.vin,
            VariantNumber: techRecord.variantNumber,
            ApprovalTypeNumber: techRecord.approvalTypeNumber,
            Make: techRecord.make,
            Model: techRecord.model,
            SpeedLimiterMrk: techRecord.vehicleType === VEHICLE_TYPES.HGV ? this.getSpeedLimiterMrk(techRecord.speedLimiterMrk) : undefined,
            FunctionCode: techRecord.functionCode,
            RegnDate: techRecord.regnDate,
            ManufactureYear: this.getFormattedField(techRecord.manufactureYear),
            GrossGbWeight: this.getFormattedField(techRecord.grossGbWeight),
            GrossEecWeight: this.getFormattedField(techRecord.grossEecWeight),
            GrossDesignWeight: this.getFormattedField(techRecord.grossDesignWeight),
            TrainGbWeight: this.getFormattedField(techRecord.trainGbWeight),
            TrainEecWeight: this.getFormattedField(techRecord.trainEecWeight),
            TrainDesignWeight: this.getFormattedField(techRecord.trainDesignWeight),
            MaxTrainGbWeight: this.getFormattedField(techRecord.maxTrainGbWeight),
            MaxTrainEecWeight: this.getFormattedField(techRecord.maxTrainEecWeight),
            Axles: this.getAxles(techRecord),
            MaxLoadOnCoupling: this.mapField(techRecord, VEHICLE_TYPES.TRL, techRecord.maxLoadOnCoupling),
            DimensionLength: this.getFormattedField(techRecord.dimensions.length),
            DimensionWidth: this.getFormattedField(techRecord.dimensions.width),
            FrontAxleTo5thWheelCouplingMin: this.mapField(techRecord, VEHICLE_TYPES.HGV, techRecord.frontAxleTo5thWheelCouplingMin),
            FrontAxleTo5thWheelCouplingMax: this.mapField(techRecord, VEHICLE_TYPES.HGV, techRecord.frontAxleTo5thWheelCouplingMax),
            CouplingCenterToRearTrlMax: this.mapField(techRecord, VEHICLE_TYPES.TRL, techRecord.couplingCenterToRearTrlMax),
            CouplingCenterToRearTrlMin: this.mapField(techRecord, VEHICLE_TYPES.TRL, techRecord.couplingCenterToRearTrlMin),
            PlateIssueDate: techRecord.plates.plateIssueDate,
            TyreUseCode: techRecord.tyreUseCode
        };
        return platePayload;
    }

    /**
     * checks if the field exists and returns it stringified or returns empty string
     * @param field to be checked
     */
    private getFormattedField(field: any) {
        if (typeof field === "undefined" || field === null) {
            return undefined;
        } else {
            return field.toString();
        }
    }

    /**
     * function for returning the value of the field based on the vehicle type
     * @param techRecord - current tech record
     * @param vehicleType - type of vehicle
     * @param fieldToMap - the field to be mapped
     */
    private mapField(techRecord: ITechRecord, vehicleType: VEHICLE_TYPES, fieldToMap: any) {
        return techRecord.vehicleType === vehicleType ? this.getFormattedField(fieldToMap) : undefined;
    }

    /**
     * Function that returns the formatted speedLimiterMrk
     * @param speedLimiterMrk
     */
    private getSpeedLimiterMrk(speedLimiterMrk: boolean) {
        return speedLimiterMrk ? "Yes" : "No";
    }

    /**
     * Function that returns the formatted eecWeight
     * @param eecWeight
     */
    private getEecWeight(eecWeight: number) {
        if (typeof eecWeight === "undefined" || eecWeight === null) {
            return "";
        } else {
            return eecWeight.toString();
        }
    }

    /**
     * Function that returns the formatted Axles object
     * @param techRecord
     */
    private getAxles(techRecord: ITechRecord) {
        const axles: any = {Axle1: {}, Axle2: {}, Axle3: {}, Axle4: {}};
        for (let i = 0; i <= 3; i++) {
            const axle = {
                Weights: {
                    GbWeight: "",
                    EecWeight: "",
                    DesignWeight: ""
                },
                Tyres: {
                    TyreSize: "",
                    PlyRating: "",
                    FitmentCode: ""
                }
            };

            if (techRecord.axles[i]) {
                axle.Weights.GbWeight = techRecord.axles[i].weights.gbWeight.toString();
                axle.Weights.EecWeight = this.getEecWeight(techRecord.axles[i].weights.eecWeight);
                axle.Weights.DesignWeight = techRecord.axles[i].weights.designWeight.toString();
                axle.Tyres.TyreSize = techRecord.axles[i].tyres.tyreSize.toString();
                axle.Tyres.PlyRating = techRecord.axles[i].tyres.plyRating.toString();
                axle.Tyres.FitmentCode = techRecord.axles[i].tyres.fitmentCode.toString();
            }
            axles[`Axle${i + 1}`] = axle;
        }
        return axles;
    }
}

export {PlateGenerationService};
