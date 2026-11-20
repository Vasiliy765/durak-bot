# Telegram Stars: implementation reference

Verified against the official Telegram documentation during implementation.

- Digital goods sold inside Telegram must use Telegram Stars with currency `XTR`. Bot invoices can use an empty provider token for digital products.
- The Bot API sends `pre_checkout_query` after payment confirmation; the bot must answer with `answerPreCheckoutQuery` within 10 seconds. A `successful_payment` update is the authoritative signal to deliver the purchased item; answering pre-checkout alone is not proof of payment.
- Mini Apps can open a generated invoice link with `Telegram.WebApp.openInvoice(url, callback)`. The invoice close event reports its status through the callback.
- Telegram assigns the bot owner responsibility for payment disputes and customer support; refunds for Stars purchases are available through `refundStarPayment`.

Sources:
- https://core.telegram.org/bots/api
- https://core.telegram.org/bots/webapps
- https://core.telegram.org/bots/payments-stars
