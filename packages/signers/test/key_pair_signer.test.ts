import { expect, test } from "@jest/globals";
import { TextEncoder } from "util";

import { KeyPairSigner } from "../src";
import { KeyPair, PublicKey } from "@near-js/crypto";
import {
    createTransaction,
    encodeTransaction,
    actionCreators,
    decodeSignedTransaction,
} from "@near-js/transactions";
import { SignMessageParams } from "../src/signer";

global.TextEncoder = TextEncoder;

test("test throws if transaction gets signed with different public key", async () => {
    const signer = new KeyPairSigner(
        KeyPair.fromString(
            "ed25519:sDa8GRWHy16zXzE5ALViy17miA7Lo39DWp8DY5HsTBEayarAWefzbgXmSpW4f8tQn3V8odsY7yGLGmgGaQN2BBF"
        )
    );

    const transaction = createTransaction(
        "signer",
        // the key is different from what signer operates
        KeyPair.fromString(
            "ed25519:2Pm1R2qRtkbFErVrjqgtNutMqEVvrErQ3wSns6rN4jd7nnmzCbda4kwRCBAnBR7RWf2faRqVMuFaJzhJp1eYfhvV"
        ).getPublicKey(),
        "receiver",
        1n,
        [],
        new Uint8Array(new Array(32))
    );

    await expect(() => signer.signTransaction(transaction)).rejects.toThrow(
        /The public key doesn\'t match the signer\'s key/
    );
});

test("test transaction gets signed with relevant public key", async () => {
    const signer = new KeyPairSigner(
        KeyPair.fromString(
            "ed25519:sDa8GRWHy16zXzE5ALViy17miA7Lo39DWp8DY5HsTBEayarAWefzbgXmSpW4f8tQn3V8odsY7yGLGmgGaQN2BBF"
        )
    );

    const transaction = createTransaction(
        "signer",
        await signer.getPublicKey(),
        "receiver",
        1n,
        [],
        new Uint8Array(new Array(32))
    );

    const [hash, { signature }] = await signer.signTransaction(transaction);

    expect(Buffer.from(hash).toString("hex")).toBe(
        "2571e3539ab5556e39441913e66abd07e634fb9850434006a719306100e641a2"
    );

    expect(Buffer.from(signature.signature.data).toString("hex")).toBe(
        "bfe2858d227e3116076a8e5ea9c5bef923c7755f19f0137d1acd9bb67973f1b8a7f83dfc0be23e307e106c8807eaa6e14c0fcb46c42acdf293c4a6a81a27fc05"
    );
});

test("serialize and sign transfer tx object", async () => {
    const keyPair = KeyPair.fromString(
        "ed25519:3hoMW1HvnRLSFCLZnvPzWeoGwtdHzke34B2cTHM8rhcbG3TbuLKtShTv3DvyejnXKXKBiV7YPkLeqUHN1ghnqpFv"
    );
    const signer = new KeyPairSigner(keyPair);

    const actions = [actionCreators.transfer(1n)];
    const blockHash = new Uint8Array([
        15, 164, 115, 253, 38, 144, 29, 242, 150, 190, 106, 220, 76, 196, 223,
        52, 208, 64, 239, 162, 67, 82, 36, 182, 152, 105, 16, 230, 48, 194, 254,
        246,
    ]);
    const transaction = createTransaction(
        "test.near",
        PublicKey.fromString(
            "ed25519:Anu7LYDfpLtkP7E16LT9imXF694BdQaa9ufVkQiwTQxC"
        ),
        "whatever.near",
        1,
        actions,
        blockHash
    );

    const [, signedTx] = await signer.signTransaction(transaction);

    expect(
        Buffer.from(signedTx.signature.ed25519Signature!.data).toString(
            "base64"
        )
    ).toEqual(
        "lpqDMyGG7pdV5IOTJVJYBuGJo9LSu0tHYOlEQ+l+HE8i3u7wBZqOlxMQDtpuGRRNp+ig735TmyBwi6HY0CG9AQ=="
    );
    const serialized = encodeTransaction(signedTx);
    expect(Buffer.from(serialized).toString("hex")).toEqual(
        "09000000746573742e6e65617200917b3d268d4b58f7fec1b150bd68d69be3ee5d4cc39855e341538465bb77860d01000000000000000d00000077686174657665722e6e6561720fa473fd26901df296be6adc4cc4df34d040efa2435224b6986910e630c2fef601000000030100000000000000000000000000000000969a83332186ee9755e4839325525806e189a3d2d2bb4b4760e94443e97e1c4f22deeef0059a8e9713100eda6e19144da7e8a0ef7e539b20708ba1d8d021bd01"
    );

    const deserialized = decodeSignedTransaction(serialized);
    expect(encodeTransaction(deserialized)).toEqual(serialized);
});

test("test sign NEP-413 message with callback url", async () => {
    const signer = new KeyPairSigner(
        KeyPair.fromString(
            "ed25519:3FyRtUUMxiNT1g2ST6mbj7W1CN7KfQBbomawC7YG4A1zwHmw2TRsn1Wc8NaFcBCoJDu3zt3znJDSwKQ31oRaKXH7"
        )
    );

    const message: SignMessageParams = {
        message: "Hello NEAR!",
        nonce: new Uint8Array(
            Buffer.from(
                "KNV0cOpvJ50D5vfF9pqWom8wo2sliQ4W+Wa7uZ3Uk6Y=",
                "base64"
            )
        ),
        recipient: "example.near",
        callbackUrl: "http://localhost:3000",
    };

    const { signature } = await signer.signNep413Message(
        message,
        "round-toad.testnet"
    );

    const expectedSignature = new Uint8Array(
        Buffer.from(
            "zzZQ/GwAjrZVrTIFlvmmQbDQHllfzrr8urVWHaRt5cPfcXaCSZo35c5LDpPpTKivR6BxLyb3lcPM0FfCW5lcBQ==",
            "base64"
        )
    );

    expect(signature).toStrictEqual(expectedSignature);
});

test("test sign NEP-413 message without callback url", async () => {
    const signer = new KeyPairSigner(
        KeyPair.fromString(
            "ed25519:3FyRtUUMxiNT1g2ST6mbj7W1CN7KfQBbomawC7YG4A1zwHmw2TRsn1Wc8NaFcBCoJDu3zt3znJDSwKQ31oRaKXH7"
        )
    );

    const message: SignMessageParams = {
        message: "Hello NEAR!",
        nonce: new Uint8Array(
            Buffer.from(
                "KNV0cOpvJ50D5vfF9pqWom8wo2sliQ4W+Wa7uZ3Uk6Y=",
                "base64"
            )
        ),
        recipient: "example.near",
    };

    const { signature } = await signer.signNep413Message(
        message,
        "round-toad.testnet"
    );

    const expectedSignature = new Uint8Array(
        Buffer.from(
            "NnJgPU1Ql7ccRTITIoOVsIfElmvH1RV7QAT4a9Vh6ShCOnjIzRwxqX54JzoQ/nK02p7VBMI2vJn48rpImIJwAw==",
            "base64"
        )
    );

    expect(signature).toStrictEqual(expectedSignature);
});
