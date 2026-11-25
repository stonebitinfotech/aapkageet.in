// Policy page templates. Placeholders are filled from Dashboard → Settings when the page is shown:
// {{brand}} {{business}} {{email}} {{whatsapp}} {{address}} {{jurisdiction}} {{delivery}} {{hours}} {{website}}
// These are general templates -have them reviewed for your business before going live.

module.exports = {
  privacy: `Last updated: {{updated}}

This Privacy Policy explains how {{business}} ("we", "us", "our"), operating the {{brand}} website {{website}}, collects, uses and protects your information when you visit our website or place an order.

1. Information we collect
• Order details you enter in our form: your name, WhatsApp/mobile number, email address, and the details you share for your song (the recipient's name, nickname, memories, stories, occasion, language and style preferences).
• Payment information: payments are processed securely by our payment partner (Razorpay). We do not see or store your full card, UPI PIN, or bank login details. We only receive a payment confirmation, payment ID and payment method.
• Technical information: IP address, browser type and device information, collected automatically for security and fraud prevention.

2. How we use your information
• To create, personalise and deliver your song via WhatsApp and/or email.
• To contact you about your order, including if any detail is missing or incorrect.
• To process payments, refunds and prevent fraud.
• To comply with legal, tax and accounting obligations.
We do not use your personal stories for advertising, and we never sell your personal information.

3. Sharing of information
We share information only with service providers needed to run our business -payment gateway, hosting, email/WhatsApp delivery -and only to the extent needed to fulfil your order, or when required by law.

4. Use of your song and story
Your memories and personal details are used only to create your song. We will not publish your song, story, name or chat screenshots publicly without your permission. If you agree to share your reaction or review, we hide personal details such as phone numbers.

5. Data retention
We keep order information for as long as needed to deliver your order, provide support and meet legal and tax requirements. You may request deletion of your story details after delivery.

6. Data security
We use reasonable technical and organisational measures (encrypted connections, restricted access) to protect your information. No method of transmission over the internet is 100% secure.

7. Your rights
You may request access to, correction of, or deletion of your personal information by writing to {{email}}. We will respond within a reasonable time.

8. Cookies
We use only essential browser storage (for example, to save your form progress on your device). We do not use advertising cookies unless stated otherwise.

9. Children
Our services are intended for users aged 18 and above. Orders for children must be placed by a parent or guardian.

10. Changes to this policy
We may update this policy from time to time. The latest version will always be available on this page.

11. Contact / Grievance Officer
{{business}}
{{address}}
Email: {{email}}
WhatsApp: {{whatsapp}}`,

  terms: `Last updated: {{updated}}

These Terms & Conditions govern your use of the {{brand}} website {{website}} and any purchase made on it. The website is operated by {{business}}. By using the website or placing an order, you agree to these terms.

1. Our service
We create personalised songs based on the details you provide and deliver them digitally (MP3) via WhatsApp and/or email. This is a digital service; no physical product is shipped.

2. Eligibility
You must be at least 18 years old, or use the website under the supervision of a parent or guardian.

3. Your order details
• You are responsible for the accuracy of the information you provide, including names, spellings, WhatsApp number and email address.
• You confirm that you have the right to share the names, stories and details you submit, and that they do not infringe anyone's rights.
• We may decline or cancel any order containing abusive, hateful, obscene, defamatory or unlawful content, with a full refund.

4. Pricing and payment
• All prices are in Indian Rupees (INR) and inclusive of applicable taxes unless stated otherwise.
• Payment must be completed online before we start creating your song. Cash on Delivery is not available.
• Prices and offers may change at any time without notice; the price shown at checkout applies to your order.

5. Delivery
Delivery timelines are described in our Shipping & Delivery Policy. Timelines are estimates and may vary in case of incomplete details, peak periods or circumstances beyond our control.

6. Creative interpretation
Each song is an original creative work. Melody, arrangement, vocals and lyric choices are made by our team based on your inputs. Minor creative differences from your expectations are not considered defects.

7. Changes and corrections
If a detail you provided needs correction (for example, a wrong spelling), contact us and we will help as described in our Refund and Return policies.

8. Licence to use your song
On full payment, you receive a personal, non-commercial licence to keep, play and share your song with friends and family, including on personal social media. Commercial use (advertising, resale, broadcasting, monetised channels) requires our written permission.

9. Intellectual property
All website content, design, text, graphics, logos and the underlying music compositions are owned by or licensed to {{business}} and may not be copied or reused without permission.

10. Limitation of liability
To the maximum extent permitted by law, our total liability for any claim related to an order is limited to the amount you paid for that order. We are not liable for indirect or consequential losses.

11. Governing law
These terms are governed by the laws of India. Courts at {{jurisdiction}} shall have exclusive jurisdiction.

12. Contact
{{business}} · {{address}} · {{email}}`,

  refund: `Last updated: {{updated}}

At {{brand}}, every song is created specially for you from your own details. Please read this Refund & Cancellation Policy before placing an order.

1. Cancellation
• You may cancel your order for a full refund only if we have not yet started creating your song. Contact us on WhatsApp or email immediately with your order number.
• Once song creation has started, the order cannot be cancelled.

2. When you are eligible for a refund
• We are unable to deliver your song for any reason on our side -full refund.
• You were charged more than once for the same order -the duplicate amount is refunded.
• Payment was deducted but no order was created -full refund after verification.

3. When refunds are not possible
• The song has been created and delivered as per the details you provided.
• Change of mind after delivery.
• Incorrect details provided by you (such as wrong names or spellings) -we will help with a correction as described in our Return Policy instead.

4. Corrections instead of refunds
If there is a mistake in the song caused by us (for example, we misspelt a name you provided correctly), we will fix and re-deliver the song free of charge.

5. Refund process and timeline
Approved refunds are made to the original payment method. Refunds are initiated within 2 business days of approval and usually reflect in your account within 5–7 business days, depending on your bank or payment provider.

6. How to request
Email {{email}} or WhatsApp {{whatsapp}} with your order number, registered mobile number and the reason for your request.`,

  return: `Last updated: {{updated}}

Because our songs are personalised digital products, they cannot be "returned" like a physical item. Instead, we offer corrections and re-delivery as described below.

1. Correction requests
If you notice an important detail that needs correction -for example a name, nickname or spelling -please contact us within 48 hours of delivery with your order number. We will review your request and make reasonable corrections.

2. What is covered
• Errors made by our team (wrong name, wrong spelling of a correctly provided name, wrong language or voice selected against your order) -corrected free of charge.
• Missing delivery or corrupted file -re-delivered free of charge.

3. What is not covered
• Changes to details after the song was created from the information you submitted.
• Requests for a completely different song, story, style or language after delivery -this is treated as a new order.
• Subjective preference about melody or creative choices.

4. Re-delivery time
Corrected songs are usually re-delivered within 24 hours of receiving all required details.

5. Contact
WhatsApp: {{whatsapp}} · Email: {{email}} · Support hours: {{hours}}`,

  shipping: `Last updated: {{updated}}

1. Digital delivery only
{{brand}} songs are digital products. No physical item is shipped and there are no shipping charges.

2. How you receive your song
Your song is delivered as an MP3 file to the WhatsApp number and/or email address you provide while ordering. Please make sure your WhatsApp number and email are correct.

3. Delivery time
• Your song is usually delivered within {{delivery}} of successful payment and receipt of all required details.
• Songs are delivered 24×7, including weekends and holidays.
• If any details are incomplete or incorrect (wrong number, wrong email, missing information), our team will contact you. Once the correct details are received, your song will generally be delivered within 24 hours.
• Delivery times may be longer during peak periods (festivals, Valentine's Day, etc.).

4. Not received your song?
Check your WhatsApp chats and email (including spam/promotions folder). If you still have not received it, contact us with your order number and we will re-send it.

5. Contact
WhatsApp: {{whatsapp}} · Email: {{email}}`,

  disclaimer: `Last updated: {{updated}}

1. Personalised creative product
Each song is an original creative work produced from the information you provide. Results -including melody, vocals and lyrics -are a creative interpretation and may differ from your personal expectations.

2. Sample content
Sample songs, images, videos, chats and reviews shown on this website are for illustration of our service. Your song will be unique to your order.

3. Delivery timelines
Delivery times mentioned on the website are typical timelines, not guarantees, and may vary as described in our Shipping & Delivery Policy.

4. Third-party services
Payments are processed by third-party payment gateways and delivery happens over third-party platforms such as WhatsApp and email. We are not responsible for outages or issues caused by these services.

5. No professional advice
Nothing on this website constitutes legal, financial or other professional advice.

6. Trademarks
All third-party names, apps and logos (such as WhatsApp, UPI, Google Pay, PhonePe, Paytm, Visa, Mastercard and RuPay) belong to their respective owners and are used only to indicate available services or payment methods.

7. Contact
{{business}} · {{email}}`,

  contact: `We're happy to help! 💝

Order support -please share your order number:
WhatsApp: {{whatsapp}}
Email: {{email}}
Support hours: {{hours}}
Songs are delivered 24×7.

Registered business
{{business}}
{{address}}`,
};
