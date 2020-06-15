import {PlateGenerationService} from "../../src/services/PlateGenerationService";
import {CertificateUploadService} from "../../src/services/CertificateUploadService";
import { ministryPlateGen } from "../../src/functions/ministryPlateGen";
import lambdaTester from "lambda-tester";
import payload from "../resources/queue-event.json";
import sinon from "sinon";

describe("Invoke ministryPlateGen Function", () => {
    const sandbox = sinon.createSandbox();
    afterEach(()  => {
        sandbox.restore();
    });
    context("when the ministryPlateGen function is invoked with valid tech record", () => {
        const lambda = lambdaTester(ministryPlateGen);

        it("should invoke certificate generate and upload services once", () => {
            // Stub PlateGenerationService generateCertificate method and resolve it
            const plateGenServiceStub = sandbox.stub(PlateGenerationService.prototype, "generateCertificate").resolvesThis();
            // Stub CertificateUploadService uploadCertificate method and resolve it
            const certUploadServiceStub = sandbox.stub(CertificateUploadService.prototype, "uploadCertificate").resolvesThis();

            return lambda.event(payload).expectResolve((response: any) => {
                sinon.assert.callCount(plateGenServiceStub, 1);
                sinon.assert.callCount(certUploadServiceStub, 1);
                plateGenServiceStub.restore();
                certUploadServiceStub.restore();
            });
        });
    });
});
