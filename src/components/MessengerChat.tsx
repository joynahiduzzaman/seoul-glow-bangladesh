"use client";

import Script from "next/script";

/**
 * Loads Facebook's official Messenger "Customer Chat" plugin — a genuine live-chat
 * widget backed by your Facebook Page inbox (agents reply from Meta Business Suite /
 * the Pages Messenger app). Renders nothing if NEXT_PUBLIC_FACEBOOK_PAGE_ID isn't set.
 *
 * Setup: Meta for Developers → your app → Messenger → Settings → enable the "Customer
 * Chat Plugin" for your Page, add this site's domain to "Whitelisted Domains", then
 * paste your Page ID into .env as NEXT_PUBLIC_FACEBOOK_PAGE_ID.
 */
export default function MessengerChat() {
  const pageId = process.env.NEXT_PUBLIC_FACEBOOK_PAGE_ID;
  if (!pageId) return null;

  return (
    <>
      <div id="fb-root" />
      <div id="fb-customer-chat" className="fb-customerchat" />
      <Script id="messenger-chat-init" strategy="afterInteractive">
        {`
          var chatbox = document.getElementById('fb-customer-chat');
          chatbox.setAttribute("page_id", "${pageId}");
          chatbox.setAttribute("attribution", "biz_inbox");

          window.fbAsyncInit = function() {
            FB.init({ xfbml: true, version: 'v20.0' });
          };

          (function(d, s, id) {
            var js, fjs = d.getElementsByTagName(s)[0];
            if (d.getElementById(id)) return;
            js = d.createElement(s); js.id = id;
            js.src = 'https://connect.facebook.net/en_US/sdk/xfbml.customerchat.js';
            fjs.parentNode.insertBefore(js, fjs);
          }(document, 'script', 'facebook-jssdk'));
        `}
      </Script>
    </>
  );
}
