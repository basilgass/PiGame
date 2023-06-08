import {Futoshiki} from "../src/lib/futoshiki";
import {expect} from "chai";

describe('Futoshiki', function () {
	it('should display an html table', function () {
		let futo = new Futoshiki(4)

		futo.addValues([
			[0,0,3],
			[2,0,1],
			[1,2,4],
			[3,3,3]
		])
		expect(futo.toHtml()).to.not.be.empty
	});
});
