/*global
	Yermah: false,
	
	QUnit: false,
	test: false,
	asyncTest: false,
	expect: false,
	module: false,
	ok: false,
	equal: false,
	notEqual: false,
	deepEqual: false,
	notDeepEqual: false,
	strictEqual: false,
	notStrictEqual: false,
	raises: false,
	start:
	false,
	stop: false
*/

module("Yermah", {
	setup: function () {
		this.ym = new Yermah();
	},
	
	teardown: function () {
		delete this.ym;
	}
});

test("isYammerUrl", function () {
	var
		i,
		testCase,
		testCases = [
			{ input: "https://www.yammer.com/", expected: true },
			{ input: "https://www.yammer.com/yourdomain.com", expected: true },
			
			{ input: "http://www.yammer.com/", expected: false },
			{ input: "http://www.yammer.com/yourdomain.com", expected: false },
			{ input: "some random crazy input https://www.yammer.com/", expected: false }
		];

	for (i = 0; i < testCases.length; i += 1) {
		testCase = testCases[i];
		equal(this.ym.isYammerUrl(testCase.input), testCase.expected, testCase.input);
	}
});