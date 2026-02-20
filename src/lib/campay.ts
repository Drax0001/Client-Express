/**
 * API wrapper for CamPay (Cameroon Mobile Money Push)
 */

export class CamPayService {
    private static baseUrl = "https://www.campay.net/api"; // Production. Use demo.campay.net for testing if needed.

    /**
     * Generates an access token using app credentials
     */
    private static async getToken(): Promise<string> {
        const res = await fetch(`${this.baseUrl}/token/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                username: process.env.CAMPAY_APP_USERNAME,
                password: process.env.CAMPAY_APP_PASSWORD,
            }),
            cache: "no-store",
        });

        if (!res.ok) {
            throw new Error(`CamPay Token Error: ${await res.text()}`);
        }

        const data = await res.json();
        return data.token;
    }

    /**
     * Request a USSD push from the user (MTN/Orange)
     */
    static async requestCollect(params: {
        amount: number;
        currency: string;
        phoneNumber: string; // Must be 237xxxxxxxxx format
        description: string;
        externalReference: string; // Our internal transaction/webhook correlation ID
    }) {
        const token = await this.getToken();

        const res = await fetch(`${this.baseUrl}/collect/`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Token ${token}`,
            },
            body: JSON.stringify({
                amount: params.amount.toString(),
                currency: params.currency || "XAF",
                from: params.phoneNumber,
                description: params.description,
                external_reference: params.externalReference,
            }),
        });

        if (!res.ok) {
            const errorText = await res.text();
            console.error("CamPay Collect Error:", errorText);
            throw new Error("Failed to initiate Mobile Money payment. Please verify the phone number.");
        }

        return res.json(); // { reference: "campay_txn_ref", status: "PENDING", ... }
    }

    /**
     * Check the status of a specific transaction
     */
    static async getTransactionStatus(reference: string) {
        const token = await this.getToken();

        const res = await fetch(`${this.baseUrl}/transaction/${reference}/`, {
            method: "GET",
            headers: {
                Authorization: `Token ${token}`,
            },
        });

        if (!res.ok) {
            throw new Error(`CamPay Status Error: ${await res.text()}`);
        }

        return res.json();
    }
}
