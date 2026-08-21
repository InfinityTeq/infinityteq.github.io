// collectors/contacts.js

export class ContactsCollector {
    constructor() {
        this.name = 'contacts';
    }

    async collect() {
        // Check if Contacts API is available
        if (!('contacts' in navigator) || !('ContactsManager' in window)) {
            return {
                status: 'not_supported',
                data: [],
                timestamp: Date.now()
            };
        }

        try {
            const contacts = await navigator.contacts.select(
                ['name', 'tel', 'email', 'address', 'icon'],
                { multiple: true }
            );

            if (contacts && contacts.length > 0) {
                const limitedData = contacts.slice(0, 20).map(c => ({
                    name: c.name ? c.name.join(' ') : 'Unknown',
                    phones: c.tel || [],
                    emails: c.email || [],
                    addresses: c.address ? c.address.map(a => ({
                        formatted: a.formatted || '',
                        street: a.street || '',
                        city: a.city || '',
                        region: a.region || '',
                        country: a.country || ''
                    })) : []
                }));

                return {
                    status: 'granted',
                    count: contacts.length,
                    data: limitedData,
                    timestamp: Date.now()
                };
            }
            
            return {
                status: 'empty',
                count: 0,
                data: [],
                timestamp: Date.now()
            };
        } catch (error) {
            return {
                status: 'denied',
                error: error.message,
                data: [],
                timestamp: Date.now()
            };
        }
    }
}