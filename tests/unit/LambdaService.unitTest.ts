import {LambdaService} from "../../src/services/LambdaService";
import {Injector} from "../../src/models/injector/Injector";

describe("LambdaService", () => {
    const lambdaService: LambdaService = Injector.resolve<LambdaService>(LambdaService);

    context("Validate invocation response", () => {

        context("when response payload is missing", () => {
            it("should throw an error", () => {
                try {
                    lambdaService.validateInvocationResponse({
                        Payload: "",
                        StatusCode: 300
                    });
                } catch (error) {
                    expect(error.statusCode).toEqual(500);
                    expect(error.body).toEqual(`Lambda invocation returned error: 300 with empty payload.`);
                }
            });
        });

        context("when payload is not a valid JSON", () => {
            it("should throw a 500 error", () => {
                try {
                    lambdaService.validateInvocationResponse({
                        Payload: '{"headers:123}',
                        StatusCode: 500
                    });
                } catch (error) {
                    expect(error.statusCode).toEqual(500);
                    expect(error.body).toEqual('Lambda invocation returned bad data: {"headers:123}');
                }
            });
        });

        context("when payload status code is >= 400", () => {
            it("should throw an error", () => {
                try {
                    lambdaService.validateInvocationResponse({
                        StatusCode: 401,
                        Payload: '{"statusCode":401,"body":"Unauthorized"}'
                    });
                } catch (error) {
                    expect(error.statusCode).toEqual(500);
                    expect(error.body).toEqual("Lambda invocation returned error: 401 Unauthorized");
                }
            });
        });

        context("when payload is missing the body", () => {
            it("should throw an error", () => {
                try {
                    lambdaService.validateInvocationResponse({
                        StatusCode: 401,
                        Payload: '{"statusCode":300,"body":null}'
                    });
                } catch (error) {
                    expect(error.statusCode).toEqual(400);
                    expect(error.body).toEqual("Lambda invocation returned bad data: {\"statusCode\":300,\"body\":null}.");
                }
            });
        });

        context("when payload is valid", () => {
            it("should return the payload parsed", () => {
                const parsedPayload = lambdaService.validateInvocationResponse({
                    StatusCode: 200,
                    Payload: '{"statusCode":200,"body":"{}"}'
                });
                expect(parsedPayload.statusCode).toEqual(200);
            });
        });
    });
});

