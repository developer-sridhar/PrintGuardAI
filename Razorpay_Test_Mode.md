# Razorpay Test Mode Guide

Use these credentials to test the payment flow in **PrintGuard AI** without using real money.

## 💳 Test Card Credentials

| Payment Method | Credential | Detail |
| :--- | :--- | :--- |
| **Visa (Domestic)** | `4111 1111 1111 1111` | Standard Visa Test Card |
| **Mastercard (Domestic)**| `5104 0155 5555 5558` | Mastercard Test Card |
| **Amex (India Domestic)** | `3402 5600 0401 007` | Amex Consumer Card (India) |
| **RuPay (Domestic)** | `6527 6589 0000 1005` | RuPay Consumer Card (India) |
| **Expiry** | `12/30` | Any future date |
| **CVV** | `123` | Any 3 digits |
| **Card Holder** | `John Doe` | Any name |
| **OTP** | `123456` | Razorpay Universal Test OTP |

## 📱 UPI Test Credentials

| Detail | UPI ID | Result |
| :--- | :--- | :--- |
| **Success** | `success@razorpay` | Simulates a successful payment |
| **Failure** | `failure@razorpay` | Simulates a failed payment |

## 🧪 Testing Steps

1.  Navigate to the **Pricing** page.
2.  Click on **"Start 7-Day Trial"** for the Pro plan.
3.  Choose **Card** or **UPI** from the Razorpay checkout.
4.  Enter the credentials from the tables above.
5.  **Success Flow**: You will see the **Celebratory Confetti Animation** and be redirected to the Dashboard.
6.  **Failure Flow**: You will see the **Oops! Payment Failed** animation and remain on the Pricing page.

> [!NOTE]
> Ensure the backend server is running while testing, as it handles order creation and signature verification.
