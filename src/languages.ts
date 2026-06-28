export type Language = 'TR' | 'AZ';

export interface Translations {
  settings: string;
  logout: string;
  language: string;
  edit: string;
  deleteForEveryone: string;
  deleteForMe: string;
  addUser: string;
  searchUser: string;
  messagePlaceholder: string;
  noChats: string;
  noChatsDesc: string;
  profile: string;
  username: string;
  email: string;
  name: string;
  password: string;
  login: string;
  register: string;
  noAccount: string;
  hasAccount: string;
  searchByHandle: string;
  addUserSuccess: string;
  userNotFound: string;
  alreadyContact: string;
  cannotAddSelf: string;
  edited: string;
  deletedMessage: string;
  cancel: string;
  save: string;
  deleteTitle: string;
  deleteDesc: string;
  notificationPermission: string;
  notificationGranted: string;
  notificationBlocked: string;
  onlineStatus: string;
  pwaTitle: string;
  pwaDesc: string;
  pwaInstall: string;
  dbStatusMongo: string;
  dbStatusLocal: string;
  errorGeneric: string;
  aboutText: string;
  contactRequestSent: string;
  incomingRequests: string;
  accept: string;
  decline: string;
  deleteContact: string;
  deleteContactConfirm: string;
}

export const translations: Record<Language, Translations> = {
  TR: {
    settings: "Ayarlar",
    logout: "Çıkış Yap",
    language: "Dil",
    edit: "Mesajı Düzenle",
    deleteForEveryone: "Herkesten Sil",
    deleteForMe: "Benden Sil",
    addUser: "Kişi Ekle",
    searchUser: "Kişi ara veya yeni sohbet başlat...",
    messagePlaceholder: "Bir mesaj yazın...",
    noChats: "Henüz sohbet yok",
    noChatsDesc: "Sağ üstteki '+' butonunu kullanarak arkadaşlarınızı ekleyin ve mesajlaşmaya başlayın!",
    profile: "Profil",
    username: "Kullanıcı Adı",
    email: "E-posta",
    name: "Ad Soyad",
    password: "Şifre",
    login: "Giriş Yap",
    register: "Kayıt Ol",
    noAccount: "Hesabınız yok mu? Kayıt olun",
    hasAccount: "Zaten hesabınız var mı? Giriş yapın",
    searchByHandle: "Eklenecek kişinin @ kullanıcı adını yazın",
    addUserSuccess: "Bağlantı isteği başarıyla gönderildi!",
    userNotFound: "Kullanıcı bulunamadı. Lütfen kullanıcı adını kontrol edin.",
    alreadyContact: "Bu kullanıcı zaten kişilerinizde ekli.",
    cannotAddSelf: "Kendinizi ekleyemezsiniz.",
    edited: "düzenlendi",
    deletedMessage: "Bu mesaj silindi",
    cancel: "İptal",
    save: "Kaydet",
    deleteTitle: "Mesajı sil",
    deleteDesc: "Bu mesajı silmek istediğinize emin misiniz?",
    notificationPermission: "Bildirim İzni İste",
    notificationGranted: "Bildirim izni verildi!",
    notificationBlocked: "Bildirim izni engellendi. Tarayıcı ayarlarından açabilirsiniz.",
    onlineStatus: "çevrimiçi",
    pwaTitle: "Uygulamayı Yükle",
    pwaDesc: "Sade WhatsApp'ı ana ekranınıza ekleyerek tıpkı bir uygulama gibi hızlıca erişebilirsiniz.",
    pwaInstall: "Ana Ekrana Ekle (PWA)",
    dbStatusMongo: "MongoDB'ye Bağlı",
    dbStatusLocal: "Yerel Veritabanı Modu (Demo)",
    errorGeneric: "Bir hata oluştu. Lütfen tekrar deneyin.",
    aboutText: "Sade WhatsApp - Kendiniz ve arkadaşlarınız için özel, sade ve kaliteli bir anlık mesajlaşma deneyimi.",
    contactRequestSent: "Bağlantı isteği gönderildi!",
    incomingRequests: "Bağlantı İstekleri",
    accept: "Kabul Et",
    decline: "Reddet",
    deleteContact: "Kişiyi Sil",
    deleteContactConfirm: "Bu kişiyi silmek istediğinizden emin misiniz? Karşılıklı olarak silinecektir."
  },
  AZ: {
    settings: "Ayarlar",
    logout: "Çıxış Et",
    language: "Dil",
    edit: "Mesajı Redaktə Et",
    deleteForEveryone: "Hamıdan Sil",
    deleteForMe: "Məndən Sil",
    addUser: "İstifadəçi Əlavə Et",
    searchUser: "İstifadəçi axtar və ya yeni söhbət başlat...",
    messagePlaceholder: "Mesaj yazın...",
    noChats: "Hələ söhbət yoxdur",
    noChatsDesc: "Sağ yuxarıdakı '+' düyməsini istifadə edərək dostlarınızı əlavə edin və mesajlaşmağa başlayın!",
    profile: "Profil",
    username: "İstifadəçi adı",
    email: "E-poçt",
    name: "Ad Soyad",
    password: "Şifrə",
    login: "Giriş Et",
    register: "Qeydiyyatdan Keç",
    noAccount: "Hesabınız yoxdur? Qeydiyyatdan keçin",
    hasAccount: "Artıq hesabınız var? Giriş edin",
    searchByHandle: "Əlavə ediləcək şəxsin @ istifadəçi adını yazın",
    addUserSuccess: "Bağlantı istəyi uğurla göndərildi!",
    userNotFound: "İstifadəçi tapılmadı. Zəhmət olmasa istifadəçi adını yoxlayın.",
    alreadyContact: "Bu istifadəçi artıq kontaktlarınızda var.",
    cannotAddSelf: "Özünüzü əlavə edə bilməzsiniz.",
    edited: "redaktə olundu",
    deletedMessage: "Bu mesaj silindi",
    cancel: "Ləğv et",
    save: "Yadda saxla",
    deleteTitle: "Mesajı sil",
    deleteDesc: "Bu mesajı silmək istədiyinizdən əminsiniz?",
    notificationPermission: "Bildiriş İcazəsi İstə",
    notificationGranted: "Bildiriş icazəsi verildi!",
    notificationBlocked: "Bildiriş icazəsi rədd edildi. Brauzer ayarlarından aça bilərsiniz.",
    onlineStatus: "onlayn",
    pwaTitle: "Tətbiqi Quraşdır",
    pwaDesc: "Sade WhatsApp-ı ana ekranınıza əlavə edərək tətbiq kimi sürətli daxil ola bilərsiniz.",
    pwaInstall: "Ana Ekrana Əlavə Et (PWA)",
    dbStatusMongo: "MongoDB-yə Qoşulub",
    dbStatusLocal: "Yerli Verilənlər Bazası Rejimi (Demo)",
    errorGeneric: "Xəta baş verdi. Zəhmət olmasa yenidən cəhd edin.",
    aboutText: "Sade WhatsApp - Özünüz və dostlarınız üçün xüsusi, sadə və keyfiyyətli anlıq mesajlaşma təcrübəsi.",
    contactRequestSent: "Bağlantı istəyi göndərildi!",
    incomingRequests: "Bağlantı İstəkləri",
    accept: "Qəbul Et",
    decline: "Rədd Et",
    deleteContact: "Kontaktı Sil",
    deleteContactConfirm: "Bu kontaktı silmək istədiyinizə əminsiniz? Qarşılıqlı olaraq silinəcək."
  }
};
