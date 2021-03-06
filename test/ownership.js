const assert = require("assert");
const Tupelo = require("../lib/tupelo");
const TUPELO_HOST = process.env.TUPELO_RPC_HOST || 'localhost:50051'

// TODO: Remove the "oldResult" tests once resolveData support is released.

describe("ownership transfer", function() {
    this.timeout(30000);

    it("can export and import", async ()=> {

        const alice = Tupelo.connect(TUPELO_HOST, {
            walletName: "alice-test",
            passPhrase: "test",
        });
        // TODO: clear RPC server state between tests automatically
        await alice.register();

        const bob = Tupelo.connect(TUPELO_HOST, {
            walletName: "bob-test",
            passPhrase: "test",
        });
        // TODO: clear RPC server state between tests automatically
        await bob.register();

        let resp = await bob.generateKey();
        const bobKey = resp.keyAddr;
        assert.equal(42, bobKey.length);

        resp = await alice.generateKey();
        const aliceKey = resp.keyAddr;

        let {chainId,} = await alice.createChainTree(aliceKey);

        resp = await alice.setData(chainId, aliceKey, "path/to/here", "hi");
        assert.notEqual(resp.tip, null);

        let result = await alice.resolveData(chainId, "path/to/here");
        let oldResult = await alice.resolve(chainId, "path/to/here");
        assert.ok(result.data == "hi" || oldResult.data == "hi");

        let chainTreeExport = await alice.exportChainTree(chainId);
        resp = await bob.importChainTree(chainTreeExport.chainTree);
        assert.equal(resp.chainId, chainId)

        result = await bob.resolveData(chainId, "path/to/here");
        oldResult = await bob.resolve(chainId, "path/to/here");
        assert.ok(result.data == "hi" || oldResult.data == "hi");

        return Promise.resolve(true);
    });

    it("can transfer from alice to bob", async ()=> {

        const alice = Tupelo.connect(TUPELO_HOST, {
            walletName: "alice-test",
            passPhrase: "test",
        });
        // TODO: clear RPC server state between tests automatically
        // await alice.register();

        const bob = Tupelo.connect(TUPELO_HOST, {
            walletName: "bob-test",
            passPhrase: "test",
        });
        // TODO: clear RPC server state between tests automatically
        // await bob.register();

        let resp = await bob.generateKey();
        const bobKey = resp.keyAddr;
        assert.equal(42, bobKey.length);

        resp = await alice.generateKey();
        const aliceKey = resp.keyAddr;

        let {chainId,} = await alice.createChainTree(aliceKey);

        resp = await alice.setData(chainId, aliceKey, "path/to/here", "hi");
        assert.notEqual(resp.tip, null);

        let result = await alice.resolveData(chainId, "path/to/here");
        let oldResult = await alice.resolve(chainId, "path/to/here");
        assert.ok(result.data == "hi" || oldResult.data == "hi");

        resp = await alice.setOwner(chainId, aliceKey, [aliceKey, bobKey]);
        assert.notEqual(resp.tip, null);

        result = await alice.resolveData(chainId, "path/to/here");
        oldResult = await alice.resolve(chainId, "path/to/here");
        assert.ok(result.data == "hi" || oldResult.data == "hi");

        return Promise.resolve(true);
    });

    it("can do a real transfer from alice to bob", async ()=> {
        const alice = Tupelo.connect(TUPELO_HOST, {
            walletName: "alice-test",
            passPhrase: "test",
        });
        // TODO: clear RPC server state between tests automatically
        // await alice.register();

        const bob = Tupelo.connect(TUPELO_HOST, {
            walletName: "bob-test",
            passPhrase: "test",
        });
        // TODO: clear RPC server state between tests automatically
        // await bob.register();

        let resp = await bob.generateKey();
        const bobKey = resp.keyAddr;

        resp = await alice.generateKey();
        const aliceKey = resp.keyAddr;

        let {chainId,} = await alice.createChainTree(aliceKey);

        for (let i = 0; i < 5; i++) {
            resp = await alice.setData(chainId, aliceKey, "path/to/" + i.toString(), "value: " + i.toString());
            assert.notEqual(resp.tip, null);
        }

        // make sure all sets can be read back
        for (let i = 0; i < 5; i++) {
            let result = await alice.resolveData(chainId, "path/to/" + i.toString());
            let oldResult = await alice.resolve(chainId, "path/to/" + i.toString());
            assert.ok(result.data == "value: " + i.toString() || oldResult.data == "value: " + i.toString());
        }

        // transfer ownership to be shared with Alice and bob
        resp = await alice.setOwner(chainId, aliceKey, [aliceKey, bobKey]);
        assert.notEqual(resp.tip, null);

        // send the chaintree over to bob
        let chainTreeExport = await alice.exportChainTree(chainId);

        resp = await bob.importChainTree(chainTreeExport.chainTree);
        assert.equal(resp.chainId, chainId)

        // make sure bob can read all the previous history
        for (let i = 0; i < 5; i++) {
            let result = await bob.resolveData(chainId, "path/to/" + i.toString());
            let oldResult = await bob.resolve(chainId, "path/to/" + i.toString());
            assert.ok(result.data == "value: " + i.toString() || oldResult.data == "value: " + i.toString());
        }

        // and can himself write to the tree
        resp = await bob.setData(chainId, bobKey, "path/to/bobvalue", "bobdidthis");
        assert.notEqual(resp.tip, null);

        result = await bob.resolveData(chainId, "path/to/bobvalue");
        oldResult = await bob.resolve(chainId, "path/to/bobvalue");
        assert.ok(result.data == "bobdidthis" || oldResult.data == "bobdidthis");

        return Promise.resolve(true);
    });
});
