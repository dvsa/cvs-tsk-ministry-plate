import {ministryPlateGen} from "../../src/functions/ministryPlateGen";
import {LambdaService} from "../../src/services/LambdaService";
import mockContext from "aws-lambda-mock-context";
import sinon from "sinon";
import queueEvent from "../resources/queue-event.json";

const ctx = mockContext();
const sandbox = sinon.createSandbox();

describe("MinistryPlateGen function", () => {

    afterAll(() => {
        sandbox.restore();
    });

    context("when a tech record is read from the queue", () => {
        context("and the payload generation throws an error", () => {
            it("should bubble that error up", async () => {
                const event: any = {Records: [{...queueEvent.Records[0]}]};

                sandbox.stub(LambdaService.prototype, "invoke").throws(new Error("It broke"));
                expect.assertions(1);
                try {
                    await ministryPlateGen(event, ctx, () => {
                        return;
                    });
                } catch (err) {
                    expect(err.message).toEqual("It broke");
                }
                sandbox.restore();
            });
        });

        context("and the event is empty", () => {
            it("should thrown an error", async () => {
                expect.assertions(1);
                try {
                    await ministryPlateGen({}, ctx, () => {
                        return;
                    });
                } catch (err) {
                    expect(err.message).toEqual("Event is empty");
                }
            });
        });

        context("and the event has no records", () => {
            it("should thrown an error", async () => {
                expect.assertions(1);
                try {
                    await ministryPlateGen({otherStuff: "hi", Records: []}, ctx, () => {
                        return;
                    });
                } catch (err) {
                    expect(err.message).toEqual("Event is empty");
                }
            });
        });
    });
});
