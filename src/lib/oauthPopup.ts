interface OAuthMessage {
  type: 'oauth:success';
  kind: 'gmail' | 'calendar';
  email: string;
}

interface OAuthPopupOptions {
  url: string;
  expectedOrigin: string;
  width?: number;
  height?: number;
  timeout?: number;
}

export function openOAuthPopup(options: OAuthPopupOptions): Promise<OAuthMessage> {
  const { url, expectedOrigin, width = 500, height = 600, timeout = 300000 } = options;

  return new Promise((resolve, reject) => {
    // Calculate popup position (center on screen)
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    // Open popup window
    const popup = window.open(
      url,
      'oauth_popup',
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
    );

    if (!popup) {
      // Popup blocked, fallback to direct navigation
      window.location.href = url;
      reject(new Error('Popup blocked by browser'));
      return;
    }

    // Set up message listener
    const messageHandler = (event: MessageEvent) => {
      // Verify origin
      if (event.origin !== expectedOrigin) {
        return;
      }

      const message = event.data as OAuthMessage;
      
      if (message.type === 'oauth:success') {
        // Clean up
        window.removeEventListener('message', messageHandler);
        clearTimeout(timeoutId);
        
        // Close popup
        if (popup && !popup.closed) {
          popup.close();
        }
        
        resolve(message);
      }
    };

    // Set up timeout
    const timeoutId = setTimeout(() => {
      window.removeEventListener('message', messageHandler);
      if (popup && !popup.closed) {
        popup.close();
      }
      reject(new Error('OAuth timeout'));
    }, timeout);

    // Listen for messages
    window.addEventListener('message', messageHandler);

    // Check if popup was closed manually
    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        window.removeEventListener('message', messageHandler);
        clearTimeout(timeoutId);
        reject(new Error('OAuth popup closed'));
      }
    }, 1000);

    // Focus popup
    popup.focus();
  });
}

// Alternative method for environments where popup might be blocked
export function redirectToOAuth(url: string): void {
  window.location.href = url;
}

// Check if popup was blocked
export function isPopupBlocked(): boolean {
  try {
    const testPopup = window.open('', '_blank', 'width=1,height=1');
    if (testPopup) {
      testPopup.close();
      return false;
    }
    return true;
  } catch {
    return true;
  }
}
