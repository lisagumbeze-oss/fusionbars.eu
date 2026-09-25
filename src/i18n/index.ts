// ===================================================
// FUSION MUSHROOM BARS EU - LOCALIZATION ARCHITECTURE
// Multilingual European Dictionaries & Resolvers
// ===================================================

import { LocaleCode } from '@/types';

export const SUPPORTED_LOCALES: LocaleCode[] = ['en', 'de', 'fr', 'es', 'it', 'nl'];
export const DEFAULT_LOCALE: LocaleCode = 'en';

export interface Dictionary {
  common: {
    brandName: string;
    tagline: string;
    supportEmail: string;
    discreetPackagingNotice: string;
  };
  navigation: {
    shop: string;
    labReports: string;
    origins: string;
    about: string;
    cart: string;
    account: string;
  };
  commerce: {
    addToCart: string;
    outOfStock: string;
    subtotal: string;
    shipping: string;
    freeShippingQualified: string;
    freeShippingRemaining: string;
    total: string;
    checkout: string;
    discreetPackaging: string;
    orderNumber: string;
    status: string;
  };
  shipping: {
    standardName: string;
    standardEst: string;
    expressName: string;
    expressEst: string;
    discreetGuarantee: string;
  };
  payment: {
    bankTransfer: string;
    cryptoTransfer: string;
    sepaInstructions: string;
    cryptoInstructions: string;
    submitProof: string;
    proofPlaceholder: string;
  };
}

export const DICTIONARIES: Record<LocaleCode, Dictionary> = {
  en: {
    common: {
      brandName: 'Fusion Mushroom Bars EU',
      tagline: 'Gourmet Artisan Chocolate & Certified Botanical Mycology',
      supportEmail: 'sales@fusionbars.eu',
      discreetPackagingNotice: 'Discreet European Dispatch from NL, ES, DE, FR',
    },
    navigation: {
      shop: 'Shop Collection',
      labReports: 'Lab Reports (COA)',
      origins: 'Fulfilment Hubs',
      about: 'About Fusion EU',
      cart: 'Shopping Bag',
      account: 'Customer Account',
    },
    commerce: {
      addToCart: 'Add to Bag',
      outOfStock: 'Out of Stock',
      subtotal: 'Subtotal',
      shipping: 'Shipping',
      freeShippingQualified: 'You qualify for Free Standard Shipping!',
      freeShippingRemaining: 'Add {amount} more for Free European Shipping',
      total: 'Grand Total',
      checkout: 'Proceed to Checkout',
      discreetPackaging: '100% Odorless, Plain Discreet Packaging',
      orderNumber: 'Order Number',
      status: 'Status',
    },
    shipping: {
      standardName: 'Standard Discreet Courier',
      standardEst: '2-4 business days across Europe',
      expressName: 'Express Priority Courier',
      expressEst: '1-2 business days express dispatch',
      discreetGuarantee: 'Plain unmarked parcel with generic European sender details',
    },
    payment: {
      bankTransfer: 'Bank Transfer (SEPA / IBAN)',
      cryptoTransfer: 'Cryptocurrency (Bitcoin)',
      sepaInstructions: 'Please send funds using your unique Order Reference in the transfer memo.',
      cryptoInstructions: 'Send the exact amount to the designated wallet and enter your transaction hash.',
      submitProof: 'Confirm Payment Transfer',
      proofPlaceholder: 'Enter SEPA Reference or Crypto Transaction Hash (TXID)',
    },
  },
  de: {
    common: {
      brandName: 'Fusion Mushroom Bars EU',
      tagline: 'Feinste handwerkliche Schokolade & zertifizierte Botanik',
      supportEmail: 'sales@fusionbars.eu',
      discreetPackagingNotice: 'Diskreter europaweiter Versand aus NL, ES, DE, FR',
    },
    navigation: {
      shop: 'Kollektion',
      labReports: 'Laborberichte',
      origins: 'Versandzentren',
      about: 'Über Fusion EU',
      cart: 'Warenkorb',
      account: 'Kundenkonto',
    },
    commerce: {
      addToCart: 'In den Warenkorb',
      outOfStock: 'Nicht vorrätig',
      subtotal: 'Zwischensumme',
      shipping: 'Versand',
      freeShippingQualified: 'Kostenloser Standardversand freigeschaltet!',
      freeShippingRemaining: 'Noch {amount} bis zum kostenlosen Versand',
      total: 'Gesamtbetrag',
      checkout: 'Zur Kasse',
      discreetPackaging: '100% geruchsneutral, neutrale Verpackung',
      orderNumber: 'Bestellnummer',
      status: 'Status',
    },
    shipping: {
      standardName: 'Standard Diskreter Versand',
      standardEst: '2-4 Werktage in ganz Europa',
      expressName: 'Express Priority Kurier',
      expressEst: '1-2 Werktage Expressversand',
      discreetGuarantee: 'Neutrales Paket ohne jegliche Markenhinweise',
    },
    payment: {
      bankTransfer: 'Banküberweisung (SEPA / IBAN)',
      cryptoTransfer: 'Kryptowährung (Bitcoin)',
      sepaInstructions: 'Bitte geben Sie bei der Überweisung Ihre Bestellnummer als Verwendungszweck an.',
      cryptoInstructions: 'Senden Sie den Betrag an die angegebene Adresse und tragen Sie den TXID-Hash ein.',
      submitProof: 'Zahlung bestätigen',
      proofPlaceholder: 'SEPA-Referenz oder Transaktions-Hash (TXID) eingeben',
    },
  },
  fr: {
    common: {
      brandName: 'Fusion Mushroom Bars EU',
      tagline: 'Chocolat artisanal gourmet & mycologie botanique certifiée',
      supportEmail: 'sales@fusionbars.eu',
      discreetPackagingNotice: 'Expédition européenne discrète depuis NL, ES, DE, FR',
    },
    navigation: {
      shop: 'Collection',
      labReports: 'Analyses Labo',
      origins: 'Centres Logistiques',
      about: 'À propos',
      cart: 'Panier',
      account: 'Mon Compte',
    },
    commerce: {
      addToCart: 'Ajouter au panier',
      outOfStock: 'Rupture de stock',
      subtotal: 'Sous-total',
      shipping: 'Livraison',
      freeShippingQualified: 'Livraison standard gratuite accordée !',
      freeShippingRemaining: 'Ajoutez {amount} pour la livraison gratuite',
      total: 'Total TTC',
      checkout: 'Commander',
      discreetPackaging: 'Colis 100% discret et sans odeur',
      orderNumber: 'Numéro de commande',
      status: 'Statut',
    },
    shipping: {
      standardName: 'Courrier Standard Discret',
      standardEst: '2-4 jours ouvrés en Europe',
      expressName: 'Courrier Express Prioritaire',
      expressEst: '1-2 jours ouvrés',
      discreetGuarantee: 'Emballage neutre sans aucune mention extérieure',
    },
    payment: {
      bankTransfer: 'Virement bancaire (SEPA / IBAN)',
      cryptoTransfer: 'Cryptomonnaie (Bitcoin)',
      sepaInstructions: 'Veuillez indiquer votre référence de commande en libellé de virement.',
      cryptoInstructions: 'Envoyez le montant à l’adresse indiquée puis confirmez le hash de transaction.',
      submitProof: 'Confirmer le virement',
      proofPlaceholder: 'Référence de virement ou hash de transaction (TXID)',
    },
  },
  es: {
    common: {
      brandName: 'Fusion Mushroom Bars EU',
      tagline: 'Chocolate artesanal gourmet y micología botánica certificada',
      supportEmail: 'sales@fusionbars.eu',
      discreetPackagingNotice: 'Envío discreto desde centros en NL, ES, DE, FR',
    },
    navigation: {
      shop: 'Colección',
      labReports: 'Certificados COA',
      origins: 'Centros de Envío',
      about: 'Sobre Nosotros',
      cart: 'Cesta',
      account: 'Mi Cuenta',
    },
    commerce: {
      addToCart: 'Añadir a la cesta',
      outOfStock: 'Agotado',
      subtotal: 'Subtotal',
      shipping: 'Envío',
      freeShippingQualified: '¡Envío estándar gratuito aplicado!',
      freeShippingRemaining: 'Añade {amount} más para envío gratuito',
      total: 'Total',
      checkout: 'Tramitar Pedido',
      discreetPackaging: 'Paquete 100% discreto y sin olores',
      orderNumber: 'Número de pedido',
      status: 'Estado',
    },
    shipping: {
      standardName: 'Mensajería Estándar Discreta',
      standardEst: '2-4 días hábiles',
      expressName: 'Mensajería Express Prioritaria',
      expressEst: '1-2 días hábiles',
      discreetGuarantee: 'Empaque neutro sin distintivos comerciales',
    },
    payment: {
      bankTransfer: 'Transferencia bancaria (SEPA / IBAN)',
      cryptoTransfer: 'Criptomoneda (Bitcoin)',
      sepaInstructions: 'Indique su referencia de pedido en el concepto de la transferencia.',
      cryptoInstructions: 'Transfiera a la dirección y pegue el hash de transacción (TXID).',
      submitProof: 'Confirmar Pago',
      proofPlaceholder: 'Referencia bancaria o hash TXID',
    },
  },
  it: {
    common: {
      brandName: 'Fusion Mushroom Bars EU',
      tagline: 'Cioccolato artigianale gourmet e micologia botanica certificata',
      supportEmail: 'sales@fusionbars.eu',
      discreetPackagingNotice: 'Spedizione discreta dai centri NL, ES, DE, FR',
    },
    navigation: {
      shop: 'Collezione',
      labReports: 'Certificati Analisi',
      origins: 'Centri Logistici',
      about: 'Chi Siamo',
      cart: 'Carrello',
      account: 'Il Mio Account',
    },
    commerce: {
      addToCart: 'Aggiungi al carrello',
      outOfStock: 'Esaurito',
      subtotal: 'Subtotale',
      shipping: 'Spedizione',
      freeShippingQualified: 'Spedizione standard gratuita qualificata!',
      freeShippingRemaining: 'Aggiungi altri {amount} per la spedizione gratuita',
      total: 'Totale',
      checkout: 'Procedi all’ordine',
      discreetPackaging: 'Pacco 100% discreto e inodore',
      orderNumber: 'Numero d’ordine',
      status: 'Stato',
    },
    shipping: {
      standardName: 'Corriere Standard Discreto',
      standardEst: '2-4 giorni lavorativi',
      expressName: 'Corriere Espresso Prioritario',
      expressEst: '1-2 giorni lavorativi',
      discreetGuarantee: 'Scatola anonima senza loghi esterni',
    },
    payment: {
      bankTransfer: 'Bonifico Bancario (SEPA / IBAN)',
      cryptoTransfer: 'Criptovaluta (Bitcoin)',
      sepaInstructions: 'Inserire il riferimento d’ordine nella causale del bonifico.',
      cryptoInstructions: 'Invia l’importo esatto e inserisci l’hash della transazione.',
      submitProof: 'Conferma Pagamento',
      proofPlaceholder: 'Riferimento bonifico o hash TXID',
    },
  },
  nl: {
    common: {
      brandName: 'Fusion Mushroom Bars EU',
      tagline: 'Ambachtelijke chocolade & gecertificeerde botanische mycologie',
      supportEmail: 'sales@fusionbars.eu',
      discreetPackagingNotice: 'Discrete Europese verzending vanuit NL, ES, DE, FR',
    },
    navigation: {
      shop: 'Collectie',
      labReports: 'Labrapporten',
      origins: 'Verzendhubs',
      about: 'Over Fusion EU',
      cart: 'Winkelmand',
      account: 'Mijn Account',
    },
    commerce: {
      addToCart: 'In winkelmand',
      outOfStock: 'Uitverkocht',
      subtotal: 'Subtotaal',
      shipping: 'Verzending',
      freeShippingQualified: 'Gratis standaard verzending geactiveerd!',
      freeShippingRemaining: 'Voeg nog {amount} toe voor gratis verzending',
      total: 'Totaalbedrag',
      checkout: 'Afrekenen',
      discreetPackaging: '100% geurneutraal, discrete verpakking',
      orderNumber: 'Bestelnummer',
      status: 'Status',
    },
    shipping: {
      standardName: 'Standaard Discrete Koerier',
      standardEst: '2-4 werkdagen binnen Europa',
      expressName: 'Express Prioriteit Koerier',
      expressEst: '1-2 werkdagen',
      discreetGuarantee: 'Neutrale verpakking zonder opdruk of logo',
    },
    payment: {
      bankTransfer: 'Bankoverschrijving (SEPA / IBAN)',
      cryptoTransfer: 'Cryptocurrency (Bitcoin)',
      sepaInstructions: 'Vermeld uw unieke bestelreferentie in de betalingsomschrijving.',
      cryptoInstructions: 'Maak het exacte bedrag over en voer uw transactiehash (TXID) in.',
      submitProof: 'Betaling Bevestigen',
      proofPlaceholder: 'SEPA-referentie of crypto TXID',
    },
  },
};

export function getDictionary(locale: LocaleCode = DEFAULT_LOCALE): Dictionary {
  return DICTIONARIES[locale] || DICTIONARIES.en;
}
