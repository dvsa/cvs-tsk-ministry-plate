import {Injector} from "../../src/models/injector/Injector";
import {PlateGenerationService} from "../../src/services/PlateGenerationService";
import {S3BucketMockService} from "../models/S3BucketMockService";
import {LambdaMockService} from "../models/LambdaMockService";
import event from "../resources/queue-event.json";
import {ICertificatePayload, IGeneratedCertificateResponse, ITechRecordWrapper} from "../../src/models";
import {cloneDeep} from "lodash";

describe("PlateGenerationService", () => {
    const plateGenerationService: PlateGenerationService = Injector.resolve<PlateGenerationService>(PlateGenerationService, [S3BucketMockService, LambdaMockService]);
    let expectedResult: ICertificatePayload;
    let vehicle: ITechRecordWrapper;
    beforeEach(() => {
        vehicle = cloneDeep(JSON.parse(event.Records[0].body));
        expectedResult = {
            Watermark: "NOT VALID",
            PLATES_DATA: {
                PlateSerialNumber: "123449",
                DtpNumber: "DTPNUM",
                PrimaryVrm: "BBBB333",
                Vin: "ABCDEFGH444444",
                VariantNumber: "22",
                ApprovalTypeNumber: "string",
                Make: "string",
                Model: "string",
                SpeedLimiterMrk: "Yes",
                FunctionCode: "A",
                RegnDate: "2019-12-13",
                ManufactureYear: "0",
                GrossGbWeight: "6",
                GrossEecWeight: "0",
                GrossDesignWeight: "0",
                TrainGbWeight: "0",
                TrainEecWeight: "0",
                TrainDesignWeight: "0",
                MaxTrainGbWeight: "0",
                MaxTrainEecWeight: "0",
                Axles: {
                    Axle1: {
                        Weights: {
                            GbWeight: "0",
                            EecWeight: "0",
                            DesignWeight: "0"
                        },
                        Tyres: {
                            TyreSize: "string",
                            PlyRating: "a",
                            FitmentCode: "double"
                        }
                    },
                    Axle2: {
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
                    },
                    Axle3: {
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
                    },
                    Axle4: {
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
                    },
                },
                DimensionLength: "0",
                DimensionWidth: "0",
                FrontAxleTo5thWheelCouplingMin: "0",
                FrontAxleTo5thWheelCouplingMax: "0",
                PlateIssueDate: "2200-12-13",
                TyreUseCode: "2"
            }
        };
    });

    afterEach(() => {
        expectedResult = {
            Watermark: "NOT VALID",
            PLATES_DATA: null
        };
        jest.restoreAllMocks();
    });

    context("when a tech record is read from the queue", () => {
        LambdaMockService.populateFunctions();

        context("and a payload is generated", () => {
            it("should return a VTG6_VTG7 payload", () => {
                return plateGenerationService.generatePayload(vehicle)
                    .then((payload: any) => {
                        expect(payload).toEqual(expectedResult);
                    });
            });

            context("and the vehicle is an HGV", () => {
                it("should return a VTG6_VTG7 payload with the not applicable fields missing (TRL specific fields should be empty)", () => {
                    delete expectedResult.PLATES_DATA.MaxLoadOnCoupling;
                    delete expectedResult.PLATES_DATA.CouplingCenterToRearTrlMax;
                    delete expectedResult.PLATES_DATA.CouplingCenterToRearTrlMin;

                    return plateGenerationService.generatePayload(vehicle)
                        .then((payload: ICertificatePayload) => {
                            expect(payload).toEqual(expectedResult);
                            expect(payload).not.toHaveProperty("MaxLoadOnCoupling");
                            expect(payload).not.toHaveProperty("CouplingCenterToRearTrlMax");
                            expect(payload).not.toHaveProperty("CouplingCenterToRearTrlMin");
                        });
                });
            });

            context("and the vehicle is a TRL", () => {
                it("should return a VTG6_VTG7 payload with the not applicable fields missing (HGV specific fields should be empty)", () => {
                    vehicle.techRecord[0].vehicleType = "trl";
                    delete expectedResult.PLATES_DATA.SpeedLimiterMrk;
                    delete expectedResult.PLATES_DATA.FrontAxleTo5thWheelCouplingMin;
                    delete expectedResult.PLATES_DATA.FrontAxleTo5thWheelCouplingMax;

                    return plateGenerationService.generatePayload(vehicle)
                        .then((payload: ICertificatePayload) => {
                            expect(payload).toEqual(expectedResult);
                            expect(payload).not.toHaveProperty("SpeedLimiterMrk");
                            expect(payload).not.toHaveProperty("FrontAxleTo5thWheelCouplingMin");
                            expect(payload).not.toHaveProperty("FrontAxleTo5thWheelCouplingMax");
                        });
                });
            });

            context("and the vehicle has only one axle", () => {
                it("should return a VTG6_VTG7 payload with the axles object containing values only for Axle1", () => {
                    return plateGenerationService.generatePayload(vehicle)
                        .then((payload: ICertificatePayload) => {
                            expect(payload.PLATES_DATA.Axles.Axle1).toBeDefined();
                            expect(payload.PLATES_DATA.Axles.Axle1.Tyres).toBeDefined();
                            expect(payload.PLATES_DATA.Axles.Axle1.Tyres.FitmentCode).toBeDefined();
                            expect(payload.PLATES_DATA.Axles.Axle1.Tyres.PlyRating).toBeDefined();
                            expect(payload.PLATES_DATA.Axles.Axle1.Tyres.TyreSize).toBeDefined();
                            expect(payload.PLATES_DATA.Axles.Axle1.Weights).toBeDefined();
                            expect(payload.PLATES_DATA.Axles.Axle1.Weights.DesignWeight).toBeDefined();
                            expect(payload.PLATES_DATA.Axles.Axle1.Weights.EecWeight).toBeDefined();
                            expect(payload.PLATES_DATA.Axles.Axle1.Weights.GbWeight).toBeDefined();
                        });
                });
            });

            context("and the vehicle has two axles", () => {
                it("should return a VTG6_VTG7 payload with the axles object containing values for Axle2", () => {
                    const axle = vehicle.techRecord[0].axles[0];
                    vehicle.techRecord[0].axles.push(axle);
                    return plateGenerationService.generatePayload(vehicle)
                        .then((payload: ICertificatePayload) => {
                            expect(payload.PLATES_DATA.Axles.Axle2).toBeDefined();
                            expect(payload.PLATES_DATA.Axles.Axle2.Tyres).toBeDefined();
                            expect(payload.PLATES_DATA.Axles.Axle2.Tyres.FitmentCode).toBeDefined();
                            expect(payload.PLATES_DATA.Axles.Axle2.Tyres.PlyRating).toBeDefined();
                            expect(payload.PLATES_DATA.Axles.Axle2.Tyres.TyreSize).toBeDefined();
                            expect(payload.PLATES_DATA.Axles.Axle2.Weights).toBeDefined();
                            expect(payload.PLATES_DATA.Axles.Axle2.Weights.DesignWeight).toBeDefined();
                            expect(payload.PLATES_DATA.Axles.Axle2.Weights.EecWeight).toBeDefined();
                            expect(payload.PLATES_DATA.Axles.Axle2.Weights.GbWeight).toBeDefined();
                        });
                });
            });

            context("and the vehicle has three axles", () => {
                it("should return a VTG6_VTG7 payload with the axles object containing values for Axle3", () => {
                    const axle = vehicle.techRecord[0].axles[0];
                    vehicle.techRecord[0].axles.push(axle, axle);
                    return plateGenerationService.generatePayload(vehicle)
                        .then((payload: ICertificatePayload) => {
                            expect(payload.PLATES_DATA.Axles.Axle3).toBeDefined();
                            expect(payload.PLATES_DATA.Axles.Axle3.Tyres).toBeDefined();
                            expect(payload.PLATES_DATA.Axles.Axle3.Tyres.FitmentCode).toBeDefined();
                            expect(payload.PLATES_DATA.Axles.Axle3.Tyres.PlyRating).toBeDefined();
                            expect(payload.PLATES_DATA.Axles.Axle3.Tyres.TyreSize).toBeDefined();
                            expect(payload.PLATES_DATA.Axles.Axle3.Weights).toBeDefined();
                            expect(payload.PLATES_DATA.Axles.Axle3.Weights.DesignWeight).toBeDefined();
                            expect(payload.PLATES_DATA.Axles.Axle3.Weights.EecWeight).toBeDefined();
                            expect(payload.PLATES_DATA.Axles.Axle3.Weights.GbWeight).toBeDefined();
                        });
                });
            });

            context("and the vehicle has four axles", () => {
                it("should return a VTG6_VTG7 payload with the axles object containing values for Axle4", () => {
                    const axle = vehicle.techRecord[0].axles[0];
                    vehicle.techRecord[0].axles.push(axle, axle, axle);
                    return plateGenerationService.generatePayload(vehicle)
                        .then((payload: ICertificatePayload) => {
                            expect(payload.PLATES_DATA.Axles.Axle4).toBeDefined();
                            expect(payload.PLATES_DATA.Axles.Axle4.Tyres).toBeDefined();
                            expect(payload.PLATES_DATA.Axles.Axle4.Tyres.FitmentCode).toBeDefined();
                            expect(payload.PLATES_DATA.Axles.Axle4.Tyres.PlyRating).toBeDefined();
                            expect(payload.PLATES_DATA.Axles.Axle4.Tyres.TyreSize).toBeDefined();
                            expect(payload.PLATES_DATA.Axles.Axle4.Weights).toBeDefined();
                            expect(payload.PLATES_DATA.Axles.Axle4.Weights.DesignWeight).toBeDefined();
                            expect(payload.PLATES_DATA.Axles.Axle4.Weights.EecWeight).toBeDefined();
                            expect(payload.PLATES_DATA.Axles.Axle4.Weights.GbWeight).toBeDefined();
                        });
                });
            });
        });

        context("and the generated payload is used to call the MOT service", () => {
            it("successfully generate a certificate", () => {
                expect.assertions(4);
                return plateGenerationService.generateCertificate(vehicle)
                    .then((response: IGeneratedCertificateResponse) => {
                        expect(response.fileName).toEqual("ABCDEFGH444444_123449.pdf");
                        expect(response.certificateType).toEqual("VTG6_VTG7");
                        expect(response.vrm).toEqual("BBBB333");
                        expect(response.email).toEqual("test@test.com");
                    });
            });
        });

        context("and the lambda invoke to the doc-gen service is unsuccessful", () => {
            it("throw an error", () => {
                LambdaMockService.prototype.invoke = jest.fn().mockImplementation(() => Promise.reject({message: "It broke"}));
                expect.assertions(1);
                return plateGenerationService.generateCertificate(vehicle)
                    .catch((errorResponse: any) => {
                        expect(errorResponse.message).toEqual("It broke");
                    });
            });
        });
    });
});
