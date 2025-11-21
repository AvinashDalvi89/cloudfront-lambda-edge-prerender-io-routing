'use strict';

exports.handler = (event, context, callback) => {
    const request = event.Records[0].cf.request;
    
    if (request.headers['x-prerender-token'] && request.headers['x-prerender-host']) {
        // This is the origin-request function - redirect to prerender.io
        console.log('Redirecting to prerender.io');
        
        if (request.headers['x-query-string']) {
            request.querystring = request.headers['x-query-string'][0].value;
        }
        
        request.origin = {
            custom: {
                domainName: 'service.prerender.io',
                port: 443,
                protocol: 'https',
                readTimeout: 20,
                keepaliveTimeout: 5,
                customHeaders: {},
                sslProtocols: ['TLSv1', 'TLSv1.1'],
                path: '/https%3A%2F%2F' + request.headers['x-prerender-host'][0].value
            }
        };
    } else {
        // This is the viewer-request function - detect bots and set headers
        const headers = request.headers;
        const user_agent = headers['user-agent'];
        const host = headers['host'];
        
        if (user_agent && host) {
            var prerender = /googlebot|adsbot\-google|Feedfetcher\-Google|bingbot|yandex|baiduspider|Facebot|facebookexternalhit|twitterbot|rogerbot|linkedinbot|embedly|quora link preview|showyoubot|outbrain|pinterest|slackbot|vkShare|W3C_Validator|redditbot|applebot|whatsapp|flipboard|tumblr|bitlybot|skypeuripreview|nuzzel|discordbot|google page speed|qwantify|pinterestbot|bitrix link preview|xing\-contenttabreceiver|chrome\-lighthouse|telegrambot|Perplexity|OAI-SearchBot|ChatGPT|GPTBot|ClaudeBot|Amazonbot|integration-test/i.test(user_agent[0].value);
            
            prerender = prerender || /_escaped_fragment_/.test(request.querystring);
            prerender = prerender && ! /\.(js|css|xml|less|png|jpg|jpeg|gif|pdf|doc|txt|ico|rss|zip|mp3|rar|exe|wmv|doc|avi|ppt|mpg|mpeg|tif|wav|mov|psd|ai|xls|mp4|m4a|swf|dat|dmg|iso|flv|m4v|torrent|ttf|woff|svg|eot)$/i.test(request.uri);
            
            if (prerender) {
                console.log('Bot detected:', user_agent[0].value);
                headers['x-prerender-token'] = [{ key: 'X-Prerender-Token', value: '{PRERENDER_KEY}'}];
                headers['x-prerender-host'] = [{ key: 'X-Prerender-Host', value: host[0].value}];
                headers['x-prerender-cachebuster'] = [{ key: 'X-Prerender-Cachebuster', value: Date.now().toString()}];
                headers['x-query-string'] = [{ key: 'X-Query-String', value: request.querystring}];
            } else {
                console.log('Regular user');
            }
        }
    }
    
    callback(null, request);
};
