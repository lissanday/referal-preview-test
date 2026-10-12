import {createServer} from "node:http";
import {URL} from "node:url";

const port = Number(process.env.PORT || 4173);
const robotsMode = ["allow", "meta-only", "facebook-block"].includes(process.env.ROBOTS_MODE)
    ? process.env.ROBOTS_MODE
    : "block";
const defaultCampaignId = "preview-test-123";
const restrictedPaths = [
    "/*/s5stats/",
    "/*/casino/",
    "/*/all-events/",
    "/*/results/",
    "/*/betslip/",
    "/*/3hrs/",
    "/*/3std/",
    "/*/3saat/",
    "/*/48hrs/",
    "/*/48std/",
    "/*/48saat/"
];
const imagePath = "/invite_friend.svg";

const isValidCampaignId = campaignId => typeof campaignId === "string" && /^[A-Za-z0-9_-]+$/.test(campaignId);

const send = (response, statusCode, body, headers = {}) => {
    response.writeHead(statusCode, {"Cache-Control": "no-store", ...headers});
    response.end(body);
};

const sendHtml = (response, statusCode, body) =>
    send(response, statusCode, body, {"Content-Type": "text/html; charset=utf-8"});

const renderRegistration = (requestUrl, response) => {
    const campaignId = requestUrl.searchParams.get("campaignId") || defaultCampaignId;
    if (!isValidCampaignId(campaignId)) {
        sendHtml(response, 400, "Invalid campaignId");
        return;
    }

    const canonicalUrl = new URL(`/en/registration/step1?campaignId=${encodeURIComponent(campaignId)}`, requestUrl);
    const imageUrl = new URL(imagePath, requestUrl);
    const title = "Referral preview test";
    const description = "This page confirms that server-rendered referral metadata is available.";

    sendHtml(
        response,
        200,
        `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="robots" content="noindex, nofollow">
<title>${title}</title>
<meta property="og:type" content="website">
<meta property="og:site_name" content="Referral preview test">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:url" content="${canonicalUrl}">
<meta property="og:image" content="${imageUrl}">
<meta property="og:image:type" content="image/svg+xml">
<link rel="canonical" href="${canonicalUrl}">
</head>
<body><h1>${title}</h1><p>Campaign: ${campaignId}</p></body>
</html>`
    );
};

const handleRedirect = (requestUrl, response) => {
    const campaignId = requestUrl.searchParams.get("campaignId") || defaultCampaignId;
    const target = requestUrl.searchParams.get("target");

    if (!isValidCampaignId(campaignId)) {
        send(response, 400, "Invalid campaignId", {"Content-Type": "text/plain; charset=utf-8"});
        return;
    }

    let targetUrl;
    try {
        targetUrl = new URL(target || `/en/registration/step1?campaignId=${campaignId}`, requestUrl);
    } catch {
        send(response, 400, "Invalid target", {"Content-Type": "text/plain; charset=utf-8"});
        return;
    }

    if (targetUrl.origin !== requestUrl.origin || !/^\/(?:de|en|tr)\/registration\/step1\/?$/.test(targetUrl.pathname)) {
        send(response, 400, "Target must be a registration path on this host", {"Content-Type": "text/plain; charset=utf-8"});
        return;
    }

    targetUrl.searchParams.set("campaignId", campaignId);
    send(response, 302, "", {Location: targetUrl.toString()});
};

const server = createServer((request, response) => {
    const forwardedProtocol = String(request.headers["x-forwarded-proto"] || "http").split(",")[0];
    const requestUrl = new URL(request.url || "/", `${forwardedProtocol}://${request.headers.host || `localhost:${port}`}`);
    console.info(`${new Date().toISOString()} ${request.method} ${requestUrl.pathname}${requestUrl.search} ua=${request.headers["user-agent"] || "-"}`);

    if (requestUrl.pathname === "/robots.txt") {
        const restrictedRules = restrictedPaths.join("\n");
        const robotsBody =
            robotsMode === "allow"
                ? `User-agent: *\nAllow: /v1/tpapi/ctfes/redirect\n${restrictedRules}\nAllow: /\n`
                : robotsMode === "meta-only"
                  ? `User-agent: facebookexternalhit\nAllow: /v1/tpapi/ctfes/redirect\n${restrictedRules}\n\nUser-agent: meta-externalfetcher\nAllow: /v1/tpapi/ctfes/redirect\n${restrictedRules}\n\nUser-agent: *\nDisallow: /v1/tpapi/ctfes/redirect\n${restrictedRules}\nAllow: /\n`
                  : robotsMode === "facebook-block"
                    ? `User-agent: facebookexternalhit\nDisallow: /\n\nUser-agent: *\nAllow: /v1/tpapi/ctfes/redirect\n${restrictedRules}\nAllow: /\n`
                    : `User-agent: *\nDisallow: /v1/tpapi/ctfes/redirect\n${restrictedRules}\nAllow: /\n`;
        send(response, 200, robotsBody, {"Content-Type": "text/plain; charset=utf-8"});
        return;
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
        send(response, 405, "Method Not Allowed", {Allow: "GET, HEAD", "Content-Type": "text/plain; charset=utf-8"});
        return;
    }

    if (requestUrl.pathname === "/v1/tpapi/ctfes/redirect") {
        handleRedirect(requestUrl, response);
        return;
    }

    if (/^\/(?:de|en|tr)\/registration\/step1\/?$/.test(requestUrl.pathname)) {
        renderRegistration(requestUrl, response);
        return;
    }

    if (requestUrl.pathname === imagePath) {
        send(response, 200, `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><rect width="1200" height="630" fill="#171717"/><circle cx="600" cy="245" r="125" fill="#ff5a36"/><path d="M535 315h130v90H535z" fill="#fff"/><text x="600" y="500" fill="#fff" font-family="Arial,sans-serif" font-size="54" text-anchor="middle">Referral preview test</text></svg>`, {"Content-Type": "image/svg+xml"});
        return;
    }

    sendHtml(response, 404, "Not found");
});

server.listen(port, () => {
    console.info(`Referral preview demo listening on http://localhost:${port}`);
    console.info(`robots mode: ${robotsMode}`);
});
