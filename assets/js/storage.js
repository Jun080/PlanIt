class StorageManager {
    static STORAGE_KEY = "travel_itinerary";

    static getItinerary() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error("Erreur lors de la lecture de l'itinéraire:", error);
            return [];
        }
    }

    static saveItinerary(itinerary) {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(itinerary));
            return true;
        } catch (error) {
            console.error("Erreur lors de la sauvegarde de l'itinéraire:", error);
            return false;
        }
    }

    static addDestination(destination) {
        const itinerary = this.getItinerary();

        const exists = itinerary.some((item) => item.id === destination.id && item.country === destination.country);
        if (exists) return false;

        itinerary.push({
            ...destination,
            addedAt: new Date().toISOString(),
        });

        return this.saveItinerary(itinerary);
    }

    static removeDestination(destinationId, country) {
        const itinerary = this.getItinerary();
        const filtered = itinerary.filter((item) => !(item.id === destinationId && item.country === country));
        return this.saveItinerary(filtered);
    }

    static clearItinerary() {
        return this.saveItinerary([]);
    }
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = StorageManager;
} else {
    window.StorageManager = StorageManager;
}
