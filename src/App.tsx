import React, { useState, useEffect, useRef } from "react";
import { 
  Send, 
  Search, 
  Plus, 
  Settings, 
  LogOut, 
  ChevronLeft, 
  Edit2, 
  Trash2, 
  Database, 
  Globe, 
  Smartphone, 
  UserPlus, 
  User as UserIcon,
  MessageCircle,
  X,
  Languages,
  CheckCheck,
  Check,
  Bell,
  CheckCircle2,
  AlertCircle,
  Camera,
  Loader2,
  Clock
} from "lucide-react";
import { translations, Language, Translations } from "./languages";
import { User, Message } from "./types";

// Helper functions for persistent Cookies
function getCookie(name: string): string | null {
  const nameEQ = name + "=";
  const ca = document.cookie.split(";");
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === " ") c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

function setCookie(name: string, value: string, days: number) {
  let expires = "";
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    expires = "; expires=" + date.toUTCString();
  }
  document.cookie = name + "=" + (value || "") + expires + "; path=/; SameSite=Lax";
}

function eraseCookie(name: string) {
  document.cookie = name + "=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax";
}

function compressAndResizeImage(file: File, maxWidth: number = 800, maxHeight: number = 800, quality: number = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Yalnızca görsel dosyaları yüklenebilir."));
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        // Calculate aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas context is not available."));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        // Get the base64 string compressed
        const compressedBase64 = canvas.toDataURL("image/jpeg", quality);
        resolve(compressedBase64);
      };
      img.onerror = () => {
        reject(new Error("Geçersiz görsel dosyası."));
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      reject(new Error("Dosya okunamadı."));
    };
    reader.readAsDataURL(file);
  });
}

export default function App() {
  // Authentication State
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem("sadewa_token") || getCookie("sadewa_token");
  });
  const [isVerifying, setIsVerifying] = useState(!!(localStorage.getItem("sadewa_token") || getCookie("sadewa_token")));
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Auth Inputs
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regAvatar, setRegAvatar] = useState<string | null>(null);
  const [regAvatarError, setRegAvatarError] = useState<string | null>(null);
  const [regAvatarLoading, setRegAvatarLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [suggestedHandle, setSuggestedHandle] = useState("");

  // App Settings State
  const [lang, setLang] = useState<Language>((localStorage.getItem("sadewa_lang") as Language) || "TR");
  const t: Translations = translations[lang];

  // Navigation / UI View States
  const [activeContactId, setActiveContactId] = useState<string | null>(null);
  const [contacts, setContacts] = useState<(User & { lastMessage: Message | null })[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [typedMessage, setTypedMessage] = useState("");

  // Modals & Menu States
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAddContactOpen, setIsAddContactOpen] = useState(false);
  const [searchContactHandle, setSearchContactHandle] = useState("");
  const [contactSearchError, setContactSearchError] = useState<string | null>(null);
  const [contactSearchSuccess, setContactSearchSuccess] = useState<string | null>(null);
  const [contactSearchLoading, setContactSearchLoading] = useState(false);

  // Message Interaction States
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [contextMenuMsgId, setContextMenuMsgId] = useState<string | null>(null);

  // PWA Install Prompt State
  const [pwaPrompt, setPwaPrompt] = useState<any>(null);
  const [isPwaInstalled, setIsPwaInstalled] = useState(false);

  // Notification Permission State
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");

  // Avatar Upload States
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarSuccess, setAvatarSuccess] = useState(false);

  // Online/Offline & Synchronization States
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [offlineQueue, setOfflineQueue] = useState<Message[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);

  // Custom Popups / Toasts / Confirms States
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);
  const [infoModal, setInfoModal] = useState<{
    title: string;
    message: string;
  } | null>(null);

  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type });
  };

  // Automatically clear toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Refs
  const messageEndRef = useRef<HTMLDivElement>(null);
  const sseSourceRef = useRef<EventSource | null>(null);

  // Clean Turkish characters function for auto-handle preview
  const cleanTurkish = (str: string) => {
    const map: Record<string, string> = {
      'ç': 'c', 'Ç': 'c', 'ğ': 'g', 'Ğ': 'g', 'ı': 'i', 'I': 'i', 'İ': 'i',
      'ö': 'o', 'Ö': 'o', 'ş': 's', 'Ş': 's', 'ü': 'u', 'Ü': 'u'
    };
    let result = str;
    for (const key in map) {
      result = result.replace(new RegExp(key, 'g'), map[key]);
    }
    return "@" + result.toLowerCase().replace(/[^a-z0-9]/g, "");
  };

  // Update suggested handle during typing name
  useEffect(() => {
    if (regName.trim()) {
      setSuggestedHandle(cleanTurkish(regName));
    } else {
      setSuggestedHandle("");
    }
  }, [regName]);

  // Check Notification Permission
  useEffect(() => {
    if ("Notification" in window) {
      setNotificationPermission(Notification.permission);
      
      // Automatically ask for permission if it is still 'default' when entering the app
      if (Notification.permission === "default") {
        Notification.requestPermission().then((permission) => {
          setNotificationPermission(permission);
        }).catch((err) => {
          console.log("Auto-notification request bypassed (requires user interaction in some browsers):", err);
        });
      }
    }
  }, []);

  // Request Notification Permission
  const requestNotificationPermission = async () => {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
    }
  };



  // Capture PWA Install Prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setPwaPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Detect if already installed (standalone mode)
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsPwaInstalled(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  // Listen to background service worker messages or URL parameters to open specific contact
  useEffect(() => {
    // 1. Check URL parameters (e.g. /?selectContact=123)
    const params = new URLSearchParams(window.location.search);
    const contactIdParam = params.get("selectContact");
    if (contactIdParam) {
      setActiveContactId(contactIdParam);
      // Clean up the URL so it doesn't persist on refresh
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }

    // 2. Listen for postMessages from Service Worker
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === "SELECT_CONTACT" && event.data.contactId) {
        setActiveContactId(event.data.contactId);
      }
    };

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", handleServiceWorkerMessage);
    }

    return () => {
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.removeEventListener("message", handleServiceWorkerMessage);
      }
    };
  }, [contacts]);

  const triggerPwaInstall = () => {
    if (pwaPrompt) {
      pwaPrompt.prompt();
      pwaPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === "accepted") {
          setIsPwaInstalled(true);
          setPwaPrompt(null);
        }
      });
    } else {
      setInfoModal({
        title: lang === "TR" ? "Uygulamayı Yükle (PWA)" : "Tətbiqi Quraşdırın (PWA)",
        message: lang === "TR" 
          ? "iOS için: Safari tarayıcısında Paylaş butonuna basıp 'Ana Ekrana Ekle' seçeneğini kullanın.\n\nAndroid için: Chrome menüsünden 'Uygulamayı yükle' veya 'Ana ekrana ekle' seçeneğini seçin."
          : "iOS üçün: Safari brauzerində Paylaş düyməsinə basıb 'Ana Ekrana Əlavə Et' seçimini edin.\n\nAndroid üçün: Chrome menyusundan 'Tətbiqi quraşdırın' və ya 'Ana ekrana əlavə edin' seçimini edin."
      });
    }
  };

  // Auth: Verify current token on mount
  useEffect(() => {
    if (token) {
      setIsVerifying(true);
      fetch("/api/auth/me", {
        headers: { "Authorization": `Bearer ${token}` }
      })
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error("Invalid token");
      })
      .then((data) => {
        setUser(data);
        setIsVerifying(false);
      })
      .catch(() => {
        logout();
        setIsVerifying(false);
      });
    } else {
      setIsVerifying(false);
    }
  }, [token]);

  // Fetch Contacts
  const fetchContacts = async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/users/contacts", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setContacts(data);
      }
    } catch (e) {
      console.error("Failed to load contacts", e);
    }
  };

  // Fetch Incoming Contact Requests
  const fetchIncomingRequests = async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/users/contacts/requests/incoming", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setIncomingRequests(data);
      }
    } catch (e) {
      console.error("Failed to load incoming requests", e);
    }
  };

  // Respond to Contact Request (Accept or Decline)
  const handleRespondRequest = async (requestId: string, action: "accept" | "decline") => {
    if (!token) return;
    try {
      const res = await fetch("/api/users/contacts/requests/respond", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ requestId, action })
      });
      if (res.ok) {
        fetchIncomingRequests();
        fetchContacts();
      }
    } catch (e) {
      console.error("Failed to respond to request", e);
    }
  };

  // Delete Contact Bidirectionally
  const handleDeleteContact = async (contactId: string) => {
    if (!token) return;
    setConfirmDialog({
      title: t.deleteContact,
      message: t.deleteContactConfirm,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/users/contacts/${contactId}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
          });
          if (res.ok) {
            if (activeContactId === contactId) {
              setActiveContactId(null);
            }
            fetchContacts();
            showToast(lang === "TR" ? "Kişi başarıyla silindi." : "Kontakt uğurla silindi.", "success");
          }
        } catch (e) {
          console.error("Failed to delete contact", e);
          showToast(t.errorGeneric, "error");
        }
        setConfirmDialog(null);
      }
    });
  };

  // Fetch Messages for current active contact
  const fetchMessages = async (contactId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/messages/${contactId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (e) {
      console.error("Failed to load messages", e);
    }
  };

  // Listen to browser online/offline events
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Synchronize offline queue when coming back online
  useEffect(() => {
    const effectiveOnline = isOnline;
    if (effectiveOnline && offlineQueue.length > 0 && token) {
      const syncMessages = async () => {
        const queueToSync = [...offlineQueue];
        setOfflineQueue([]); // Clear early to prevent double syncs

        for (const pendingMsg of queueToSync) {
          try {
            const res = await fetch("/api/messages", {
              method: "POST",
              headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
              },
              body: JSON.stringify({ receiverId: pendingMsg.receiverId, text: pendingMsg.text })
            });
            if (res.ok) {
              const realMsg = await res.json();
              // Replace pending message in active state
              setMessages((prev) => prev.map((m) => m.id === pendingMsg.id ? realMsg : m));
            } else {
              // Put back in queue if failed
              setOfflineQueue((prev) => [...prev, pendingMsg]);
            }
          } catch (e) {
            console.error("Failed to sync offline message", e);
            setOfflineQueue((prev) => [...prev, pendingMsg]);
          }
        }
        fetchContacts();
      };
      syncMessages();
    }
  }, [isOnline, offlineQueue, token]);

  // Fetch contacts list and incoming requests when authenticated
  useEffect(() => {
    if (user && token) {
      fetchContacts();
      fetchIncomingRequests();
    }
  }, [user, token]);

  // Fetch messages when active contact changes
  useEffect(() => {
    if (activeContactId) {
      fetchMessages(activeContactId);
    }
  }, [activeContactId]);

  // Real-Time EventStream (SSE) Setup
  useEffect(() => {
    if (user && token) {
      // Close old connection if exists
      if (sseSourceRef.current) {
        sseSourceRef.current.close();
      }

      const sse = new EventSource(`/api/updates/stream?userId=${user.id}`);
      sseSourceRef.current = sse;

      sse.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === "ping") return;

          // Real-time: Refresh contacts list on structural changes
          if (data.type === "contacts_update") {
            fetchContacts();
            fetchIncomingRequests();
            return;
          }

          // Real-time: Handle messages read confirmation
          if (data.type === "messages_read") {
            if (user && data.senderId === user.id && activeContactId === data.readerId) {
              setMessages((prev) => 
                prev.map((msg) => 
                  msg.senderId === user.id && msg.receiverId === data.readerId 
                    ? { ...msg, read: true } 
                    : msg
                )
              );
            }
            fetchContacts();
            return;
          }

          // Real-time: Handle incoming message
          if (data.type === "new_message") {
            const msg: Message = data.message;
            
            // If the message is for our current active chat, append it
            if (activeContactId && (msg.senderId === activeContactId || msg.receiverId === activeContactId)) {
              setMessages((prev) => {
                // Prevent duplicate additions
                if (prev.some(m => m.id === msg.id)) return prev;
                return [...prev, msg];
              });

              // Send read receipt if it's incoming message from active contact
              if (msg.senderId === activeContactId) {
                fetch("/api/messages/read", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                  },
                  body: JSON.stringify({ contactId: activeContactId })
                }).catch(e => console.error("Error sending read receipt", e));
              }
            }

            // Always reload contacts to show correct last message & sorting
            fetchContacts();

            // Trigger Browser Push Notification if page/chat is not active
            if (msg.senderId !== user.id) {
              const isTabBackground = document.hidden;
              const isChatNotFocused = activeContactId !== msg.senderId;

              if ((isTabBackground || isChatNotFocused) && Notification.permission === "granted") {
                const senderUser = contacts.find((c) => c.id === msg.senderId);
                const senderAvatar = data.senderAvatar || senderUser?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(data.senderName || "User")}`;
                const title = data.senderName || "Yeni Mesaj";
                const options = {
                  body: msg.text,
                  icon: senderAvatar,
                  badge: "/badge.svg",
                  tag: msg.senderId, // Groups notifications from the same sender
                  renotify: true,
                  data: { senderId: msg.senderId }
                };

                // Always prefer Service Worker registration to display notifications, especially on mobile/Android Chrome where new Notification() throws an error.
                if ("serviceWorker" in navigator) {
                  navigator.serviceWorker.ready.then((registration) => {
                    registration.showNotification(title, options);
                  }).catch((err) => {
                    console.error("Service worker notification failed, trying native fallback:", err);
                    try {
                      const notify = new Notification(title, options);
                      notify.onclick = () => {
                        window.focus();
                        setActiveContactId(msg.senderId);
                      };
                    } catch (e) {
                      console.error("Native Notification fallback failed:", e);
                    }
                  });
                } else {
                  try {
                    const notify = new Notification(title, options);
                    notify.onclick = () => {
                      window.focus();
                      setActiveContactId(msg.senderId);
                    };
                  } catch (e) {
                    console.error("Native Notification failed:", e);
                  }
                }
              }
            }
          }

          // Real-time: Message Edits
          if (data.type === "message_edit") {
            setMessages((prev) => 
              prev.map(m => m.id === data.messageId ? { ...m, text: data.text, edited: true } : m)
            );
            fetchContacts();
          }

          // Real-time: Message Deleted for Everyone
          if (data.type === "message_delete_everyone") {
            setMessages((prev) => 
              prev.map(m => m.id === data.messageId ? { ...m, text: "Bu mesaj silindi", deletedForEveryone: true } : m)
            );
            fetchContacts();
          }

          // Real-time: Message Deleted for Me
          if (data.type === "message_delete_me") {
            setMessages((prev) => prev.filter(m => m.id !== data.messageId));
            fetchContacts();
          }

        } catch (e) {
          console.error("Failed to parse SSE message", e);
        }
      };

      return () => {
        sse.close();
      };
    }
  }, [user, token, activeContactId]);

  // Scroll to bottom on messages update
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Register Handler
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regEmail.trim() || !regPassword.trim()) {
      setAuthError(translations[lang].errorGeneric);
      return;
    }
    setAuthError(null);
    setAuthLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: regName, email: regEmail, password: regPassword, avatar: regAvatar })
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || "Register failed");
      } else {
        localStorage.setItem("sadewa_token", data.token);
        setCookie("sadewa_token", data.token, 365); // Persistent cookie for 1 year
        setToken(data.token);
        setUser(data.user);
        // Reset fields
        setRegName("");
        setRegEmail("");
        setRegPassword("");
        setRegAvatar(null);
        setRegAvatarError(null);
      }
    } catch (e) {
      setAuthError(translations[lang].errorGeneric);
    } finally {
      setAuthLoading(false);
    }
  };

  // Login Handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPassword.trim()) {
      setAuthError(translations[lang].errorGeneric);
      return;
    }
    setAuthError(null);
    setAuthLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || "Login failed");
      } else {
        localStorage.setItem("sadewa_token", data.token);
        setCookie("sadewa_token", data.token, 365); // Persistent cookie for 1 year
        setToken(data.token);
        setUser(data.user);
        // Reset fields
        setLoginEmail("");
        setLoginPassword("");
      }
    } catch (e) {
      setAuthError(translations[lang].errorGeneric);
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("sadewa_token");
    eraseCookie("sadewa_token");
    setToken(null);
    setUser(null);
    setActiveContactId(null);
    setMessages([]);
    setContacts([]);
    if (sseSourceRef.current) {
      sseSourceRef.current.close();
    }
  };

  // Send Message Handler
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedMessage.trim() || !activeContactId || !token || !user) return;

    const textToSend = typedMessage;
    setTypedMessage(""); // Clear early for native speed feeling

    const effectiveOnline = isOnline;

    // Create custom pending message structure
    const pendingMsg: Message = {
      id: "pending_" + Math.random().toString(36).substring(2, 11),
      senderId: user.id,
      receiverId: activeContactId,
      text: textToSend,
      edited: false,
      deletedForEveryone: false,
      deletedForUsers: [],
      createdAt: new Date().toISOString(),
      pending: !effectiveOnline,
      read: false
    };

    // Optimistically add message to UI
    setMessages((prev) => [...prev, pendingMsg]);

    if (!effectiveOnline) {
      // Add to offline queue
      setOfflineQueue((prev) => [...prev, pendingMsg]);
      return;
    }

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ receiverId: activeContactId, text: textToSend })
      });
      if (res.ok) {
        const data = await res.json();
        // Replace pending message with real message
        setMessages((prev) => prev.map((m) => m.id === pendingMsg.id ? data : m));
        fetchContacts();
      } else {
        const data = await res.json();
        showToast(data.error || "Mesaj gönderilemedi.", "error");
        // Remove optimistically added message on hard failure
        setMessages((prev) => prev.filter((m) => m.id !== pendingMsg.id));
      }
    } catch (e) {
      console.error("Failed to send message", e);
      // On network exception, convert to offline pending message automatically
      setMessages((prev) => prev.map((m) => m.id === pendingMsg.id ? { ...m, pending: true } : m));
      setOfflineQueue((prev) => [...prev, { ...pendingMsg, pending: true }]);
    }
  };

  // Avatar Change Handler
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setAvatarError(lang === "TR" ? "Yalnızca görsel dosyaları yükleyebilirsiniz." : "Yalnızca şəkil faylları yükləyə bilərsiniz.");
      setAvatarSuccess(false);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setAvatarError(lang === "TR" ? "Görsel boyutu en fazla 10MB olabilir." : "Şəkil ölçüsü maksimum 10MB ola bilər.");
      setAvatarSuccess(false);
      return;
    }

    setAvatarLoading(true);
    setAvatarError(null);
    setAvatarSuccess(false);

    try {
      const base64 = await compressAndResizeImage(file, 400, 400, 0.85);
      const res = await fetch("/api/auth/avatar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ avatar: base64 })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Upload failed");
      }

      if (user) {
        setUser({ ...user, avatar: base64 });
      }
      setAvatarSuccess(true);
    } catch (err: any) {
      setAvatarError(err.message || "Upload failed");
    } finally {
      setAvatarLoading(false);
    }
  };

  // Add Contact Handler (Search and Add)
  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchContactHandle.trim() || !token) return;

    setContactSearchLoading(true);
    setContactSearchError(null);
    setContactSearchSuccess(null);

    const rawHandle = searchContactHandle.trim();
    const formattedHandle = rawHandle.startsWith("@") ? rawHandle : `@${rawHandle}`;

    try {
      // 1. Search for user handle
      const searchRes = await fetch(`/api/users/search?handle=${encodeURIComponent(formattedHandle)}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (!searchRes.ok) {
        setContactSearchError(t.userNotFound);
        setContactSearchLoading(false);
        return;
      }

      const foundUser: User = await searchRes.json();

      if (foundUser.id === user?.id) {
        setContactSearchError(t.cannotAddSelf);
        setContactSearchLoading(false);
        return;
      }

      // Check if already in contacts list
      if (contacts.some(c => c.id === foundUser.id)) {
        setContactSearchError(t.alreadyContact);
        setContactSearchLoading(false);
        return;
      }

      // 2. Add to contacts
      const addRes = await fetch("/api/users/contacts/add", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ contactId: foundUser.id })
      });

      if (addRes.ok) {
        setContactSearchSuccess(t.addUserSuccess);
        setSearchContactHandle("");
        
        // Close modal after success message
        setTimeout(() => {
          setIsAddContactOpen(false);
          setContactSearchSuccess(null);
        }, 1500);

      } else {
        const errData = await addRes.json();
        setContactSearchError(errData.error || t.errorGeneric);
      }

    } catch (e) {
      setContactSearchError(t.errorGeneric);
    } finally {
      setContactSearchLoading(false);
    }
  };

  // Edit Message Request
  const handleSaveEdit = async () => {
    if (!editingMessageId || !editText.trim() || !token) return;

    try {
      const res = await fetch(`/api/messages/${editingMessageId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ text: editText })
      });

      if (res.ok) {
        setMessages((prev) => 
          prev.map(m => m.id === editingMessageId ? { ...m, text: editText, edited: true } : m)
        );
        setEditingMessageId(null);
        setEditText("");
        setContextMenuMsgId(null);
      }
    } catch (e) {
      console.error("Message edit failed", e);
    }
  };

  // Delete Message Request
  const handleDeleteMessage = async (messageId: string, deleteType: "everyone" | "me") => {
    if (!token) return;

    try {
      const res = await fetch(`/api/messages/${messageId}/delete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ type: deleteType })
      });

      if (res.ok) {
        if (deleteType === "everyone") {
          setMessages((prev) => 
            prev.map(m => m.id === messageId ? { ...m, text: "Bu mesaj silindi", deletedForEveryone: true } : m)
          );
        } else {
          setMessages((prev) => prev.filter(m => m.id !== messageId));
        }
        setContextMenuMsgId(null);
      }
    } catch (e) {
      console.error("Message delete failed", e);
    }
  };

  // Filter Contacts
  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeContact = contacts.find(c => c.id === activeContactId);

  // Helper to format timestamps to nice simple string e.g. "12:45"
  const formatTime = (isoString: string) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  // Check language change
  const handleLanguageChange = (newLang: Language) => {
    setLang(newLang);
    localStorage.setItem("sadewa_lang", newLang);
  };

  // Auto focus input on edit trigger
  const triggerEdit = (msg: Message) => {
    setEditingMessageId(msg.id);
    setEditText(msg.text);
    setContextMenuMsgId(null);
  };

  return (
    <div id="app_root" className="fixed inset-0 flex flex-col bg-[#0b141a] text-gray-100 overflow-hidden select-none font-sans">
      
      {/* 1. VERIFYING STATE SPLASH SCREEN */}
      {isVerifying ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-[#0a1014] p-4 text-center">
          <div className="flex flex-col items-center space-y-6">
            <div className="p-6 bg-[#00a884] rounded-2xl shadow-2xl relative">
              <MessageCircle className="w-16 h-16 text-[#111b21]" />
              <div className="absolute -bottom-1 -right-1 bg-[#111b21] rounded-full p-1.5 border-4 border-[#0a1014]">
                <Loader2 className="w-4 h-4 text-[#00a884] animate-spin" />
              </div>
            </div>
            <div className="flex flex-col items-center space-y-2">
              <h1 className="text-2xl font-bold tracking-tight text-white font-sans">Sade <span className="text-[#00a884]">WhatsApp</span></h1>
              <p className="text-xs text-[#8696a0] font-medium leading-relaxed max-w-xs">
                {lang === "TR" ? "Güvenli bağlantı kuruluyor ve oturum açılıyor..." : "Təhlükəsiz bağlantı qurulur və giriş edilir..."}
              </p>
            </div>
          </div>
        </div>
      ) : !user ? (
        <div id="auth_container" className="flex-1 overflow-y-auto bg-[#0a1014] relative scrollbar-thin scrollbar-thumb-[#202c33]">
          <div className="min-h-full flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 w-full">
            
            {/* Subtle Branding Watermark */}
            <div className="flex items-center space-x-2 mb-6 flex-shrink-0">
              <div className="p-2 bg-[#00a884] rounded-xl shadow-lg">
                <MessageCircle className="w-5 h-5 text-[#111b21]" />
              </div>
              <span className="text-lg font-bold tracking-tight text-white font-sans">Sade <span className="text-[#00a884]">WhatsApp</span></span>
            </div>

            <div className="w-full max-w-md bg-[#111b21] p-6 sm:p-8 rounded-2xl border border-[#222e35] shadow-2xl transition-all duration-300">
              <div className="text-center mb-6">
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-1.5">
                  {authMode === "login" ? t.login : t.register}
                </h2>
                <p className="text-xs sm:text-sm text-[#8696a0] font-medium leading-relaxed max-w-xs mx-auto">
                  {t.aboutText}
                </p>
              </div>

              <form id="auth_form" onSubmit={authMode === "login" ? handleLogin : handleRegister} className="space-y-4">
                
                {authMode === "register" && (
                  <>
                    {/* Register Avatar Selector */}
                    <div className="flex flex-col items-center space-y-1.5 pb-1">
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-[#8696a0]">
                        {lang === "TR" ? "Profil Resmi (İsteğe Bağlı)" : "Profil Şəkli (İstəyə Bağlı)"}
                      </label>
                      <div className="relative group cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            if (!file.type.startsWith("image/")) {
                              setRegAvatarError(lang === "TR" ? "Yalnızca görsel dosyaları yükleyebilirsiniz." : "Yalnızca şəkil faylları yükləyə bilərsiniz.");
                              return;
                            }
                            if (file.size > 10 * 1024 * 1024) {
                              setRegAvatarError(lang === "TR" ? "Görsel en fazla 10MB boyutunda olabilir." : "Şəkil maksimum 10MB ola bilər.");
                              return;
                            }
                            setRegAvatarLoading(true);
                            setRegAvatarError(null);
                            try {
                              const base64 = await compressAndResizeImage(file, 400, 400, 0.85);
                              setRegAvatar(base64);
                            } catch (err: any) {
                              setRegAvatarError(err.message || "Görsel yüklenemedi.");
                            } finally {
                              setRegAvatarLoading(false);
                            }
                          }}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          disabled={regAvatarLoading}
                        />
                        <div className="w-16 h-16 rounded-full border-2 border-dashed border-[#222e35] group-hover:border-[#00a884] bg-[#202c33] flex flex-col items-center justify-center overflow-hidden transition-all relative shadow-inner">
                          {regAvatar ? (
                            <img src={regAvatar} alt="Profile preview" className="w-full h-full object-cover" />
                          ) : regAvatarLoading ? (
                            <Loader2 className="w-5 h-5 text-[#00a884] animate-spin" />
                          ) : (
                            <div className="flex flex-col items-center text-center p-1.5">
                              <Camera className="w-4.5 h-4.5 text-[#8696a0] group-hover:text-[#00a884] transition-colors" />
                              <span className="text-[8px] text-[#8696a0] mt-0.5 group-hover:text-gray-300 transition-colors">
                                {lang === "TR" ? "Yükle" : "Yüklə"}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      {regAvatarError && (
                        <p className="text-[10px] text-rose-400 font-semibold text-center max-w-[200px]">
                          {regAvatarError}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-[#8696a0]">{t.name}</label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Örn: Sunay Seyidli"
                          value={regName}
                          onChange={(e) => setRegName(e.target.value)}
                          className="w-full bg-[#202c33] border border-[#222e35] rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#00a884] focus:ring-1 focus:ring-[#00a884] transition-all"
                          required
                        />
                      </div>
                      {suggestedHandle && (
                        <p className="text-[11px] text-[#00a884] mt-0.5 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Alt Ad: <strong className="font-mono">{suggestedHandle}</strong>
                        </p>
                      )}
                    </div>
                  </>
                )}

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-[#8696a0]">{t.email}</label>
                  <input
                    type="email"
                    placeholder="name@example.com"
                    value={authMode === "login" ? loginEmail : regEmail}
                    onChange={(e) => authMode === "login" ? setLoginEmail(e.target.value) : setRegEmail(e.target.value)}
                    className="w-full bg-[#202c33] border border-[#222e35] rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#00a884] focus:ring-1 focus:ring-[#00a884] transition-all"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-[#8696a0]">{t.password}</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={authMode === "login" ? loginPassword : regPassword}
                    onChange={(e) => authMode === "login" ? setLoginPassword(e.target.value) : setRegPassword(e.target.value)}
                    className="w-full bg-[#202c33] border border-[#222e35] rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#00a884] focus:ring-1 focus:ring-[#00a884] transition-all"
                    required
                  />
                </div>

                {authError && (
                  <div className="flex items-center space-x-2 bg-red-950/40 border border-red-900 text-red-400 p-3 rounded-xl text-[11px] font-medium animate-shake">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{authError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full bg-[#00a884] hover:bg-[#008f70] text-[#111b21] font-bold py-3 px-4 rounded-xl shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none text-xs sm:text-sm tracking-wide mt-2"
                >
                  {authLoading ? "..." : (authMode === "login" ? t.login : t.register)}
                </button>
              </form>

              <div className="mt-5 text-center">
                <button
                  onClick={() => {
                    setAuthMode(authMode === "login" ? "register" : "login");
                    setAuthError(null);
                  }}
                  className="text-xs font-medium text-[#8696a0] hover:text-white transition-all underline decoration-dotted underline-offset-4"
                >
                  {authMode === "login" ? t.noAccount : t.hasAccount}
                </button>
              </div>

              {/* Quick language toggle on login */}
              <div className="flex justify-center items-center gap-4 mt-6 pt-5 border-t border-[#222e35]">
                <button 
                  onClick={() => handleLanguageChange("TR")} 
                  className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${lang === "TR" ? "bg-[#00a884] text-[#111b21]" : "text-[#8696a0] hover:text-white"}`}
                >
                  Türkçe
                </button>
                <span className="text-[#222e35]">|</span>
              <button 
                onClick={() => handleLanguageChange("AZ")} 
                className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${lang === "AZ" ? "bg-[#00a884] text-[#111b21]" : "text-[#8696a0] hover:text-white"}`}
              >
                Azerbaycan
              </button>
            </div>

          </div>
          </div>
        </div>
      ) : (
        
        /* 2. AUTHENTICATED WORKSPACE LAYOUT */
        <div id="main_workspace" className="flex-1 flex overflow-hidden relative">
          
          {/* 2A. SIDEBAR: Contacts & Chats list */}
          <aside 
            id="chats_sidebar" 
            className={`w-full md:w-[380px] lg:w-[420px] flex-shrink-0 bg-[#111b21] border-r border-[#222e35] flex flex-col transition-all duration-300 ${activeContactId ? 'hidden md:flex' : 'flex'}`}
          >
            
            {/* Sidebar User Header */}
            <div id="sidebar_header" className="h-[64px] bg-[#202c33] px-4 flex items-center justify-between border-b border-[#222e35]">
              <div className="flex items-center space-x-3">
                <img 
                  src={user.avatar} 
                  alt="My avatar" 
                  className="w-10 h-10 rounded-full border border-[#222e35] bg-[#0b141a]"
                  referrerPolicy="no-referrer"
                />
                <div className="overflow-hidden">
                  <h3 className="text-sm font-semibold text-white truncate max-w-[140px] md:max-w-[160px]">{user.name}</h3>
                  <p className="text-xs text-[#00a884] font-mono truncate">{user.username}</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button 
                  id="btn_add_contact"
                  onClick={() => setIsAddContactOpen(true)}
                  className="p-2 hover:bg-[#2a3942] rounded-full text-[#aebac1] hover:text-white transition-all active:scale-90"
                  title={t.addUser}
                >
                  <Plus className="w-5 h-5" />
                </button>
                <button 
                  id="btn_settings"
                  onClick={() => setIsSettingsOpen(true)}
                  className="p-2 hover:bg-[#2a3942] rounded-full text-[#aebac1] hover:text-white transition-all active:scale-90"
                  title={t.settings}
                >
                  <Settings className="w-5 h-5" />
                </button>
                <button 
                  id="btn_logout"
                  onClick={logout}
                  className="p-2 hover:bg-[#2a3942] rounded-full text-[#f43f5e]/80 hover:text-[#f43f5e] transition-all active:scale-90"
                  title={t.logout}
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Offline Status Banner */}
            {!isOnline && (
              <div className="bg-[#ffd279] text-[#111b21] px-4 py-2.5 flex items-center space-x-2.5 text-xs font-semibold select-none shadow-md border-b border-[#cca040]">
                <Globe className="w-4 h-4 text-[#111b21] animate-pulse" />
                <div className="flex-1">
                  <span>{lang === "TR" ? "Bilgisayar bağlı değil" : "Kompüter qoşulmayıb"}</span>
                  <p className="text-[10px] text-[#111b21]/70 font-normal mt-0.5">
                    {lang === "TR" 
                      ? "Bağlantınızı kontrol edin." 
                      : "Bağlantınızı yoxlayın."}
                  </p>
                </div>
              </div>
            )}

            {/* Chats Search Bar */}
            <div id="search_bar_container" className="p-2 bg-[#111b21]">
              <div className="relative flex items-center bg-[#202c33] rounded-lg border border-transparent focus-within:border-[#00a884]/30 px-3 py-1.5 transition-all">
                <Search className="w-4 h-4 text-[#8696a0] mr-2 flex-shrink-0" />
                <input 
                  type="text" 
                  placeholder={t.searchUser}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-sm text-white placeholder-[#8696a0] focus:outline-none"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="text-[#8696a0] hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Gelen Bağlantı İstekleri */}
            {incomingRequests.length > 0 && (
              <div className="mx-2 my-1.5 bg-[#202c33]/40 border border-[#222e35]/60 rounded-xl overflow-hidden shadow-lg animate-fade-in">
                <div className="px-3 py-2 bg-[#202c33]/80 text-xs font-bold text-[#00a884] flex items-center justify-between border-b border-[#222e35]/50">
                  <div className="flex items-center space-x-1.5">
                    <UserPlus className="w-3.5 h-3.5 text-[#00a884]" />
                    <span>{t.incomingRequests} ({incomingRequests.length})</span>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-[#00a884] animate-pulse" />
                </div>
                <div className="divide-y divide-[#222e35]/30 max-h-[180px] overflow-y-auto">
                  {incomingRequests.map((req) => (
                    <div key={req.id} className="p-2.5 flex items-center justify-between space-x-2 bg-[#111b21]/20 hover:bg-[#202c33]/30 transition-all">
                      <div className="flex items-center space-x-2.5 overflow-hidden">
                        <img 
                          src={req.fromUser.avatar} 
                          alt="" 
                          className="w-8 h-8 rounded-full border border-[#222e35] bg-[#0b141a]" 
                          referrerPolicy="no-referrer" 
                        />
                        <div className="overflow-hidden">
                          <p className="text-xs font-bold text-white truncate max-w-[120px]">{req.fromUser.name}</p>
                          <p className="text-[10px] text-[#8696a0] font-mono truncate max-w-[120px]">{req.fromUser.username}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1.5 flex-shrink-0">
                        <button 
                          onClick={() => handleRespondRequest(req.id, "accept")}
                          className="px-2.5 py-1 text-[10px] font-bold bg-[#00a884] hover:bg-[#008f6f] text-white rounded-md transition-all cursor-pointer flex items-center space-x-1 shadow-sm active:scale-95"
                        >
                          <Check className="w-3 h-3" />
                          <span>{t.accept}</span>
                        </button>
                        <button 
                          onClick={() => handleRespondRequest(req.id, "decline")}
                          className="px-2 py-1 text-[10px] font-bold bg-[#202c33] hover:bg-[#2a3942] hover:text-red-400 text-gray-300 border border-[#222e35] rounded-md transition-all cursor-pointer flex items-center space-x-1 active:scale-95"
                        >
                          <X className="w-3 h-3" />
                          <span>{t.decline}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Conversations List */}
            <div id="chats_list" className="flex-1 overflow-y-auto divide-y divide-[#222e35]/30">
              {filteredContacts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-center px-6">
                  <div className="w-12 h-12 bg-[#202c33] rounded-full flex items-center justify-center text-[#8696a0] mb-3 border border-[#222e35]">
                    <MessageCircle className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-semibold text-white">{t.noChats}</h4>
                  <p className="text-xs text-[#8696a0] mt-1 max-w-[240px] leading-relaxed">{t.noChatsDesc}</p>
                </div>
              ) : (
                filteredContacts.map((contact) => {
                  const isActive = contact.id === activeContactId;
                  const lastMsg = contact.lastMessage;
                  const isLastMsgMine = lastMsg?.senderId === user.id;

                  return (
                    <div
                      key={contact.id}
                      onClick={() => setActiveContactId(contact.id)}
                      className={`px-4 py-3.5 flex items-center space-x-3 cursor-pointer select-none transition-all ${isActive ? 'bg-[#2a3942]' : 'hover:bg-[#202c33]'}`}
                    >
                      <img 
                        src={contact.avatar} 
                        alt={contact.name} 
                        className="w-12 h-12 rounded-full border border-[#222e35] bg-[#0b141a]"
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold text-white truncate">{contact.name}</h4>
                          {lastMsg && (
                            <span className="text-[10px] text-[#8696a0] font-medium ml-1 flex-shrink-0">
                              {formatTime(lastMsg.createdAt)}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-xs text-[#8696a0] truncate font-mono">
                            {contact.username}
                          </p>
                          {/* Last Message preview */}
                          {lastMsg && (
                            <div className="flex items-center space-x-1 ml-1 flex-shrink-0">
                              {isLastMsgMine && !lastMsg.deletedForEveryone && (
                                lastMsg.pending ? (
                                  <Clock className="w-3 h-3 text-gray-500" />
                                ) : lastMsg.read ? (
                                  <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />
                                ) : (
                                  <Check className="w-3.5 h-3.5 text-[#8696a0]" />
                                )
                              )}
                            </div>
                          )}
                        </div>

                        {lastMsg && (
                          <p className="text-xs text-[#8696a0] truncate mt-0.5 max-w-[260px]">
                            {lastMsg.deletedForEveryone ? (
                              <span className="italic text-gray-500">{t.deletedMessage}</span>
                            ) : (
                              <span>
                                {isLastMsgMine ? "Sen: " : ""}{lastMsg.text}
                              </span>
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

          </aside>

          {/* 2B. MAIN PANEL: Active Chat Screen / Empty State */}
          <main 
            id="chat_viewport" 
            className={`flex-1 bg-[#0b141a] flex flex-col relative transition-all duration-300 ${!activeContactId ? 'hidden md:flex' : 'flex'}`}
          >
            
            {activeContactId && activeContact ? (
              <div className="flex-1 flex flex-col h-full overflow-hidden">
                
                {/* Chat Panel Header */}
                <header id="chat_header" className="h-[64px] bg-[#202c33] px-4 flex items-center justify-between border-b border-[#222e35] z-10 flex-shrink-0">
                  <div className="flex items-center space-x-3 overflow-hidden">
                    {/* Back Button on Mobile */}
                    <button 
                      onClick={() => setActiveContactId(null)}
                      className="md:hidden p-1.5 hover:bg-[#2a3942] rounded-full text-[#aebac1] transition-all"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>

                    <img 
                      src={activeContact.avatar} 
                      alt={activeContact.name} 
                      className="w-10 h-10 rounded-full border border-[#222e35] bg-[#0b141a]"
                      referrerPolicy="no-referrer"
                    />
                    
                    <div className="overflow-hidden">
                      <h3 className="text-sm font-semibold text-white truncate max-w-[180px] md:max-w-xs">{activeContact.name}</h3>
                      <p className="text-xs text-[#8696a0] font-mono flex items-center gap-1 truncate">
                        <span>{activeContact.username}</span>
                        <span className="text-[#222e35]">•</span>
                        <span className="text-[#00a884] font-sans lowercase font-normal">{t.onlineStatus}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 text-[#aebac1]">
                    {/* Standard top header meta details */}
                    <span className="text-xs bg-[#2a3942] px-2.5 py-1 rounded-md text-gray-300 font-medium font-mono hidden sm:inline-block">
                      ID: {activeContact.id.substring(0, 6)}
                    </span>
                    
                    {/* Delete Contact Button */}
                    <button
                      onClick={() => handleDeleteContact(activeContact.id)}
                      className="p-2 hover:bg-rose-500/10 hover:text-rose-400 rounded-lg text-[#aebac1] transition-all cursor-pointer active:scale-95 flex items-center justify-center"
                      title={t.deleteContact}
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </header>

                {/* Messages Container Area */}
                <div 
                  id="messages_container" 
                  className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-4 bg-[#0b141a] relative"
                  style={{
                    backgroundImage: "radial-gradient(#1c2c35 0.75px, #0b141a 0.75px)",
                    backgroundSize: "16px 16px"
                  }}
                  onClick={() => setContextMenuMsgId(null)} // Close contextual dropdowns on canvas click
                >
                  
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <div className="bg-[#202c33] rounded-xl px-5 py-3 border border-[#222e35] max-w-sm">
                        <p className="text-xs text-[#8696a0] leading-relaxed">
                          🔐 {lang === "TR" 
                            ? "Mesajlar uçtan uca şifrelidir. Bu sohbetteki hiç kimse dışarıdan yazışmalarınızı okuyamaz." 
                            : "Mesajlar uçdan uca şifrəlidir. Bu söhbətdəki heç kim kənardan yazışmalarınızı oxuya bilməz."}
                        </p>
                      </div>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isMine = msg.senderId === user.id;
                      const isContextOpen = contextMenuMsgId === msg.id;

                      return (
                        <div 
                          key={msg.id} 
                          className={`flex w-full ${isMine ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className="relative group max-w-[75%] sm:max-w-[65%]">
                            
                            {/* Message Bubble container */}
                            <div 
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!msg.deletedForEveryone) {
                                  setContextMenuMsgId(isContextOpen ? null : msg.id);
                                }
                              }}
                              className={`px-3.5 py-2 rounded-2xl text-sm relative transition-all duration-150 border select-none cursor-pointer hover:brightness-110 active:scale-[0.99] ${
                                isMine 
                                  ? 'bg-[#005c4b] text-white rounded-tr-none border-[#004d3e]' 
                                  : 'bg-[#202c33] text-gray-200 rounded-tl-none border-[#2d3a43]'
                              }`}
                            >
                              
                              {/* Edit Trigger Panel (Inline Input if active editing) */}
                              {editingMessageId === msg.id ? (
                                <div className="flex flex-col space-y-2 min-w-[200px]" onClick={(e) => e.stopPropagation()}>
                                  <input 
                                    type="text"
                                    value={editText}
                                    onChange={(e) => setEditText(e.target.value)}
                                    className="w-full bg-[#111b21] border border-[#00a884] rounded px-2.5 py-1 text-sm text-white focus:outline-none"
                                    onKeyDown={(e) => e.key === "Enter" && handleSaveEdit()}
                                    autoFocus
                                  />
                                  <div className="flex justify-end space-x-2 text-xs">
                                    <button 
                                      onClick={() => setEditingMessageId(null)}
                                      className="px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded text-white font-medium"
                                    >
                                      {t.cancel}
                                    </button>
                                    <button 
                                      onClick={handleSaveEdit}
                                      className="px-2.5 py-1 bg-[#00a884] hover:bg-[#008f70] text-[#111b21] rounded font-bold"
                                    >
                                      {t.save}
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="break-words leading-relaxed pr-8">
                                  {msg.deletedForEveryone ? (
                                    <span className="italic text-[#8696a0]/70 select-none flex items-center gap-1.5 text-xs">
                                      🚫 {t.deletedMessage}
                                    </span>
                                  ) : (
                                    <span>{msg.text}</span>
                                  )}
                                </div>
                              )}

                              {/* Message Metadata (Time and ticks) */}
                              {!editingMessageId && (
                                <div className="flex items-center justify-end space-x-1 mt-1 text-[9px] text-[#8696a0] select-none">
                                  {msg.edited && !msg.deletedForEveryone && (
                                    <span className="italic uppercase font-semibold text-[8px] tracking-wider text-[#8696a0]/80">
                                      {t.edited}
                                    </span>
                                  )}
                                  <span>{formatTime(msg.createdAt)}</span>
                                  {isMine && !msg.deletedForEveryone && (
                                    msg.pending ? (
                                      <Clock className="w-2.5 h-2.5 text-[#8696a0] animate-pulse" />
                                    ) : msg.read ? (
                                      <CheckCheck className="w-3 h-3 text-[#53bdeb]" />
                                    ) : (
                                      <Check className="w-3 h-3 text-gray-400" />
                                    )
                                  )}
                                </div>
                              )}

                              {/* Ellipsis/Menu Toggle (Only if not editing) */}
                              {!editingMessageId && !msg.deletedForEveryone && (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setContextMenuMsgId(isContextOpen ? null : msg.id);
                                  }}
                                  className="absolute top-1.5 right-1.5 hidden group-hover:flex p-1 bg-[#202c33]/40 hover:bg-[#2a3942]/60 rounded text-gray-400 hover:text-white transition-all duration-100"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <circle cx="12" cy="12" r="1" />
                                    <circle cx="12" cy="5" r="1" />
                                    <circle cx="12" cy="19" r="1" />
                                  </svg>
                                </button>
                              )}

                              {/* Context Dropdown Menu */}
                              {isContextOpen && (
                                <div 
                                  className="absolute right-0 top-8 bg-[#111b21] border border-[#222e35] rounded-xl shadow-2xl py-1 w-44 z-50 overflow-hidden"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {isMine && (
                                    <button 
                                      onClick={() => triggerEdit(msg)}
                                      className="w-full text-left px-4 py-2 hover:bg-[#202c33] text-xs text-white flex items-center space-x-2"
                                    >
                                      <Edit2 className="w-3.5 h-3.5 text-[#00a884]" />
                                      <span>{t.edit}</span>
                                    </button>
                                  )}
                                  
                                  {isMine && (
                                    <button 
                                      onClick={() => handleDeleteMessage(msg.id, "everyone")}
                                      className="w-full text-left px-4 py-2 hover:bg-[#202c33] text-xs text-[#f43f5e] flex items-center space-x-2"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      <span>{t.deleteForEveryone}</span>
                                    </button>
                                  )}

                                  <button 
                                    onClick={() => handleDeleteMessage(msg.id, "me")}
                                    className="w-full text-left px-4 py-2 hover:bg-[#202c33] text-xs text-gray-400 flex items-center space-x-2"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>{t.deleteForMe}</span>
                                  </button>
                                </div>
                              )}

                            </div>

                          </div>
                        </div>
                      );
                    })
                  )}

                  <div ref={messageEndRef} />
                </div>

                {/* Message Bottom Input Composer */}
                <form 
                  id="message_input_form"
                  onSubmit={handleSendMessage} 
                  className="h-[62px] bg-[#202c33] px-4 flex items-center space-x-2 flex-shrink-0 border-t border-[#222e35]"
                >
                  <input
                    type="text"
                    placeholder={t.messagePlaceholder}
                    value={typedMessage}
                    onChange={(e) => setTypedMessage(e.target.value)}
                    className="flex-1 bg-[#2a3942] border border-transparent focus:border-[#00a884]/35 rounded-xl px-4 py-2.5 text-sm text-white placeholder-[#8696a0] focus:outline-none transition-all"
                  />
                  
                  <button 
                    type="submit"
                    disabled={!typedMessage.trim()}
                    className="p-3 bg-[#00a884] disabled:bg-[#202c33] disabled:text-gray-500 hover:bg-[#008f70] text-[#111b21] rounded-full shadow-md transition-all active:scale-[0.95] flex items-center justify-center cursor-pointer flex-shrink-0"
                  >
                    <Send className="w-4 h-4 translate-x-[1px] -translate-y-[0.5px]" />
                  </button>
                </form>

              </div>
            ) : (
              
              /* Chat Viewport Empty State (Sleek minimalist page) */
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#0b141a]">
                
                <div className="relative mb-6">
                  <div className="p-8 bg-[#111b21] rounded-full border border-[#222e35] shadow-xl text-[#00a884]/90">
                    <MessageCircle className="w-16 h-16 animate-pulse" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-[#00a884] rounded-full p-2 border-4 border-[#0b141a] text-[#111b21]">
                    <CheckCheck className="w-4 h-4" />
                  </div>
                </div>

                <h2 className="text-2xl font-extrabold text-white tracking-tight">Sade WhatsApp</h2>
                <p className="text-sm text-[#8696a0] mt-2 max-w-sm leading-relaxed">
                  {lang === "TR" 
                    ? "Mesajlaşmaya başlamak için sol menüden bir sohbet seçin veya yeni bir kişi ekleyin." 
                    : "Mesajlaşmağa başlamaq üçün sol menyudan bir söhbət seçin və ya yeni istifadəçi əlavə edin."}
                </p>

                {/* Elegant instructions to install PWA on empty screen */}
                {!isPwaInstalled && (
                  <div className="mt-10 max-w-sm p-4 bg-[#111b21]/70 border border-[#222e35] rounded-2xl flex flex-col items-center space-y-3 shadow-md">
                    <Smartphone className="w-6 h-6 text-[#00a884]" />
                    <div className="text-xs">
                      <strong className="text-white block mb-0.5">{t.pwaTitle}</strong>
                      <span className="text-[#8696a0] leading-relaxed block">{t.pwaDesc}</span>
                    </div>
                    <button 
                      onClick={triggerPwaInstall}
                      className="px-4 py-2 bg-[#202c33] hover:bg-[#2a3942] text-xs font-semibold text-white border border-[#222e35] rounded-xl transition-all cursor-pointer"
                    >
                      {t.pwaInstall}
                    </button>
                  </div>
                )}
              </div>

            )}

          </main>

          {/* 3. SETTINGS MODAL */}
          {isSettingsOpen && (
            <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center z-50 p-4">
              <div className="bg-[#111b21] border border-[#222e35] rounded-3xl w-full max-w-md p-6 shadow-2xl relative max-h-[90vh] flex flex-col overflow-hidden animate-fade-in">
                
                {/* Close Button */}
                <button 
                  onClick={() => setIsSettingsOpen(false)}
                  className="absolute top-5 right-5 p-1.5 text-[#8696a0] hover:text-white rounded-full hover:bg-[#202c33] transition-all z-10"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Header */}
                <div className="flex items-center space-x-3 mb-6 flex-shrink-0">
                  <div className="p-2.5 bg-[#202c33] text-[#00a884] rounded-xl border border-[#222e35]/60 shadow-inner">
                    <Settings className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold text-white tracking-tight">{t.settings}</h3>
                    <p className="text-[11px] text-[#8696a0]">{lang === "TR" ? "Hesap ve uygulama tercihleri" : "Hesab və tətbiq tənzimləmələri"}</p>
                  </div>
                </div>

                {/* Content */}
                <div className="space-y-5 overflow-y-auto pr-1 flex-1 scrollbar-thin scrollbar-thumb-[#202c33] scrollbar-track-transparent">
                  
                  {/* Connection Status Section (Elegant indicator only) */}
                  <div className="bg-[#0b141a]/60 p-4 rounded-2xl border border-[#222e35]/50 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${(isOnline) ? "bg-[#00a884]/10 text-[#00a884]" : "bg-red-500/10 text-red-400"}`}>
                        <Globe className="w-4 h-4" />
                      </div>
                      <div className="text-xs">
                        <h4 className="font-bold text-white">
                          {lang === "TR" ? "Ağ Bağlantısı" : "Şəbəkə Qoşulması"}
                        </h4>
                        <p className="text-[#8696a0] text-[11px]">
                          {(isOnline) 
                            ? (lang === "TR" ? "Çevrimiçi" : "Onlayn")
                            : (lang === "TR" ? "Bağlantı Yok" : "Bağlantı Yoxdur")}
                        </p>
                      </div>
                    </div>
                    <span className={`w-2.5 h-2.5 rounded-full animate-pulse ${(isOnline) ? "bg-[#00a884] shadow-[0_0_8px_#00a884]" : "bg-red-500 shadow-[0_0_8px_#f43f5e]"}`} />
                  </div>

                  {/* Profile Section with Avatar Updater */}
                  <div className="bg-[#1e2a30]/30 p-4 rounded-2xl border border-[#222e35]/60 space-y-4">
                    <div className="flex items-center space-x-4">
                      <div className="relative group cursor-pointer flex-shrink-0">
                        <img 
                          src={user?.avatar} 
                          alt="Avatar" 
                          className="w-16 h-16 rounded-full object-cover border-2 border-[#00a884] bg-[#0b141a] shadow-lg group-hover:opacity-75 transition-all"
                          referrerPolicy="no-referrer"
                        />
                        <label className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer">
                          <Camera className="w-5 h-5 text-white" />
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={handleAvatarChange} 
                            className="hidden" 
                            disabled={avatarLoading}
                          />
                        </label>
                        {avatarLoading && (
                          <div className="absolute inset-0 bg-black/75 rounded-full flex items-center justify-center">
                            <span className="w-5 h-5 border-2 border-[#00a884] border-t-transparent rounded-full animate-spin"></span>
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-white truncate">{user?.name}</h4>
                        <p className="text-xs text-[#00a884] font-mono truncate">{user?.username}</p>
                        <p className="text-[10px] text-[#8696a0] mt-0.5">{lang === "TR" ? "Profil fotoğrafını değiştirmek için üzerine tıklayın." : "Profil şəklini dəyişmək üçün üzərinə vurun."}</p>
                      </div>
                    </div>

                    {avatarError && (
                      <div className="text-xs text-rose-400 font-semibold bg-rose-950/20 border border-rose-950/40 px-3 py-2 rounded-xl flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>{avatarError}</span>
                      </div>
                    )}

                    {avatarSuccess && (
                      <div className="text-xs text-[#00a884] font-semibold bg-green-950/20 border border-green-950/40 px-3 py-2 rounded-xl flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{lang === "TR" ? "Profil resmi güncellendi!" : "Profil şəkli yeniləndi!"}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Language Settings Section */}
                  <div className="space-y-2 bg-[#0b141a]/30 p-4 rounded-2xl border border-[#222e35]/50">
                    <label className="text-[11px] font-bold text-[#8696a0] uppercase tracking-wider flex items-center gap-2">
                      <Languages className="w-4 h-4 text-[#00a884]" />
                      {t.language}
                    </label>
                    <div className="grid grid-cols-2 gap-2 bg-[#0b141a] p-1 rounded-xl border border-[#222e35]/80">
                      <button
                        onClick={() => handleLanguageChange("TR")}
                        className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${lang === "TR" ? "bg-[#00a884] text-[#111b21] shadow-md" : "text-gray-400 hover:text-white"}`}
                      >
                        Türkçe
                      </button>
                      <button
                        onClick={() => handleLanguageChange("AZ")}
                        className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${lang === "AZ" ? "bg-[#00a884] text-[#111b21] shadow-md" : "text-gray-400 hover:text-white"}`}
                      >
                        Azerbaycan
                      </button>
                    </div>
                  </div>

                  {/* Browser Native Notification Permission Section */}
                  <div className="bg-[#0b141a]/40 p-4 rounded-2xl border border-[#222e35]/50 space-y-3">
                    <div className="flex items-start space-x-3">
                      <div className="p-2 bg-[#00a884]/10 text-[#00a884] rounded-lg">
                        <Bell className="w-4 h-4" />
                      </div>
                      <div className="flex-1 text-xs">
                        <h4 className="font-bold text-white mb-0.5">Anlık Bildirimler</h4>
                        <p className="text-[#8696a0] leading-relaxed text-[11px]">
                          {lang === "TR" 
                            ? "Yeni mesaj geldiğinde sesli bildirimler almak için anlık bildirim izni vermelisiniz." 
                            : "Yeni mesaj gəldikdə səsli bildirişlər almaq üçün brauzer bildiriş icazəsi verməlisiniz."}
                        </p>
                      </div>
                    </div>
                    
                    {notificationPermission === "granted" ? (
                      <div className="text-[11px] font-semibold text-[#00a884] flex items-center gap-1.5 bg-[#0b141a]/60 px-3 py-2.5 rounded-xl border border-[#00a884]/20">
                        <CheckCircle2 className="w-4 h-4 text-[#00a884]" />
                        {t.notificationGranted}
                      </div>
                    ) : notificationPermission === "denied" ? (
                      <div className="text-[11px] font-semibold text-rose-400 flex items-center gap-1.5 bg-rose-950/20 px-3 py-2.5 rounded-xl border border-rose-950/40">
                        <AlertCircle className="w-4 h-4" />
                        {t.notificationBlocked}
                      </div>
                    ) : (
                      <button
                        onClick={requestNotificationPermission}
                        className="w-full py-2.5 bg-[#202c33] hover:bg-[#2a3942] text-xs font-bold text-white rounded-xl border border-[#222e35] transition-all cursor-pointer flex items-center justify-center space-x-2"
                      >
                        <Bell className="w-3.5 h-3.5 text-[#00a884]" />
                        <span>{t.notificationPermission}</span>
                      </button>
                    )}
                  </div>

                  {/* Footer App Info */}
                  <div className="text-center text-[10px] text-[#8696a0] pt-4 border-t border-[#222e35]/40 flex flex-col items-center justify-center gap-1">
                    <div className="flex items-center space-x-1.5 text-white/80 font-bold">
                      <MessageCircle className="w-3.5 h-3.5 text-[#00a884]" />
                      <span>Sade WhatsApp</span>
                    </div>
                    <p className="text-[9px]">v1.0.0 • Kendiniz ve arkadaşlarınız için.</p>
                  </div>

                </div>
              </div>
            </div>
          )}

          {/* 4. ADD CONTACT MODAL */}
          {isAddContactOpen && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-[#111b21] border border-[#222e35] rounded-2xl w-full max-w-sm p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
                
                <button 
                  onClick={() => {
                    setIsAddContactOpen(false);
                    setContactSearchError(null);
                    setContactSearchSuccess(null);
                  }}
                  className="absolute top-4 right-4 p-1 text-[#8696a0] hover:text-white rounded-full hover:bg-[#202c33] transition-all"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 bg-[#202c33] text-[#00a884] rounded-lg border border-[#222e35]">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold text-white">{t.addUser}</h3>
                </div>

                <p className="text-xs text-[#8696a0] leading-relaxed mb-4">
                  {t.searchByHandle}
                </p>

                <form onSubmit={handleAddContact} className="space-y-4">
                  <div>
                    <input 
                      type="text" 
                      placeholder="Örn: @sunay"
                      value={searchContactHandle}
                      onChange={(e) => setSearchContactHandle(e.target.value)}
                      className="w-full bg-[#202c33] border border-[#222e35] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#00a884] transition-all"
                      required
                      autoFocus
                    />
                  </div>

                  {contactSearchError && (
                    <p className="text-xs text-rose-400 font-semibold bg-rose-950/20 border border-rose-950 px-3 py-2 rounded-lg">
                      ⚠️ {contactSearchError}
                    </p>
                  )}

                  {contactSearchSuccess && (
                    <p className="text-xs text-[#00a884] font-semibold bg-green-950/20 border border-green-950 px-3 py-2 rounded-lg flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      {contactSearchSuccess}
                    </p>
                  )}

                  <div className="flex justify-end space-x-2 pt-2 text-xs font-semibold">
                    <button 
                      type="button"
                      onClick={() => {
                        setIsAddContactOpen(false);
                        setContactSearchError(null);
                        setContactSearchSuccess(null);
                      }}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-xl text-white cursor-pointer"
                    >
                      {t.cancel}
                    </button>
                    <button 
                      type="submit"
                      disabled={contactSearchLoading || !searchContactHandle.trim()}
                      className="px-4 py-2 bg-[#00a884] hover:bg-[#008f70] text-[#111b21] rounded-xl transition-all cursor-pointer disabled:opacity-50"
                    >
                      {contactSearchLoading ? "..." : t.addUser}
                    </button>
                  </div>
                </form>

              </div>
            </div>
          )}

          {/* Custom Toast Notification */}
          {toast && (
            <div className="fixed bottom-6 right-6 z-50 animate-bounce-short">
              <div className={`flex items-center space-x-3 px-4 py-3 rounded-xl border shadow-2xl ${
                toast.type === "success" 
                  ? "bg-[#0b251a] border-[#00a884] text-[#00a884]" 
                  : toast.type === "error" 
                    ? "bg-[#2c1519] border-rose-500 text-rose-400" 
                    : "bg-[#202c33] border-[#2d3a43] text-gray-200"
              }`}>
                {toast.type === "success" ? (
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                )}
                <span className="text-xs font-semibold">{toast.message}</span>
                <button onClick={() => setToast(null)} className="text-current hover:opacity-80 transition-opacity cursor-pointer">
                  <X className="w-4 h-4 ml-2" />
                </button>
              </div>
            </div>
          )}

          {/* Custom Confirm Dialog Modal */}
          {confirmDialog && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-[#111b21] border border-[#222e35] rounded-2xl w-full max-w-sm p-5 shadow-2xl animate-scale-in">
                <div className="flex items-center space-x-3 text-rose-400 mb-4">
                  <div className="p-2 bg-rose-500/10 rounded-lg">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <h4 className="text-base font-bold text-white">{confirmDialog.title}</h4>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed mb-6">
                  {confirmDialog.message}
                </p>
                <div className="flex justify-end space-x-2.5 text-xs font-semibold">
                  <button
                    onClick={() => setConfirmDialog(null)}
                    className="px-4 py-2.5 bg-[#202c33] hover:bg-[#2a3942] text-white border border-[#222e35] rounded-xl transition-all cursor-pointer active:scale-95"
                  >
                    {t.cancel}
                  </button>
                  <button
                    onClick={() => confirmDialog.onConfirm()}
                    className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl transition-all cursor-pointer shadow-lg active:scale-95"
                  >
                    {lang === "TR" ? "Sil" : "Sil"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Custom Info Modal */}
          {infoModal && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-[#111b21] border border-[#222e35] rounded-2xl w-full max-w-md p-6 shadow-2xl relative animate-scale-in">
                <button
                  onClick={() => setInfoModal(null)}
                  className="absolute top-4 right-4 p-1 text-[#8696a0] hover:text-white rounded-full hover:bg-[#202c33] transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
                
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 bg-[#00a884]/10 text-[#00a884] rounded-lg">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <h4 className="text-base font-bold text-white">{infoModal.title}</h4>
                </div>

                <div className="text-xs text-gray-300 leading-relaxed mb-4 whitespace-pre-line bg-[#202c33]/40 border border-[#222e35]/60 p-4 rounded-xl">
                  {infoModal.message}
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setInfoModal(null)}
                    className="px-5 py-2.5 bg-[#00a884] hover:bg-[#008f70] text-[#111b21] font-semibold text-xs rounded-xl transition-all cursor-pointer shadow-md active:scale-95"
                  >
                    {lang === "TR" ? "Anladım" : "Anladım"}
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
