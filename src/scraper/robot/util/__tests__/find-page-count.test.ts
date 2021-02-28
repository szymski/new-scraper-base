import { findPageCount, FindPageCountCallback } from "../find-page-count";

const findPageCountCallbackCreator = (targetPage: number): FindPageCountCallback => {
    return (page) => {
        return Promise.resolve(page <= targetPage);
    };
}

describe("Find page count tests", () => {

    it("Should find page number given only callback", async () => {
        const callback = findPageCountCallbackCreator(27);
        const result = await findPageCount(callback);
        expect(result).toBe(27);
    });

    it("Should find page number given configuration with only max param", async () => {
        const callback = findPageCountCallbackCreator(270);
        const result = await findPageCount({
            hasItems: callback,
            max: 1000
        });
        expect(result).toBe(270);
    });

    it("Should find page number given configuration with only min param", async () => {
        const callback = findPageCountCallbackCreator(72);
        const result = await findPageCount({
            hasItems: callback,
            min: 50
        });
        expect(result).toBe(72);
    });

    it("Should find page number given configuration object", async () => {
        const callback = findPageCountCallbackCreator(350);
        const result = await findPageCount({
            hasItems: callback,
            min: 1,
            max: 1000
        });
        expect(result).toBe(350);
    });

    it("Given invalid min/max should throw error", () => {
        expect(findPageCount({
            hasItems: findPageCountCallbackCreator(10),
            max: 10,
            min: 100
        })).rejects.toThrowError("Min page cannot be bigger than max page!");
    });

})