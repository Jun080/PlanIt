class DataManager {
    constructor() {
        this.travelData = null;
        this.useWikidata = false;

        this.cityTags = null;
        this.cityTagsLoaded = false;
    }

    async loadTravelData() {
        if (this.useWikidata && this.travelData === null) {
            try {
                const response = await fetch("assets/data/travel-data.json");
                this.travelData = await response.json();
                return this.travelData;
            } catch (error) {
                console.error("Erreur lors du chargement des données:", error);
                this.travelData = { countries: {} };
                return this.travelData;
            }
        }

        if (this.travelData) {
            return this.travelData;
        }

        try {
            const response = await fetch("assets/data/travel-data.json");
            this.travelData = await response.json();
            return this.travelData;
        } catch (error) {
            console.error("Erreur lors du chargement des données:", error);
            return null;
        }
    }

    enableWikidata() {
        this.useWikidata = true;
    }

    async fetchWikidataCities({ limit = 30, minPopulation = 500000 } = {}) {
        const sparql = `
            SELECT ?city ?cityLabel ?countryLabel ?image ?population WHERE {
            ?city wdt:P31/wdt:P279* wd:Q515.
            ?city wdt:P17 ?country.
            ?country wdt:P30 wd:Q46.
            ?city wdt:P1082 ?population.
            FILTER(?population > ${minPopulation})
            OPTIONAL { ?city wdt:P18 ?image }
            SERVICE wikibase:label { bd:serviceParam wikibase:language "fr,en". }
            }
            ORDER BY DESC(?population)
            LIMIT ${limit * 2}
        `;

        const url = "https://query.wikidata.org/sparql?query=" + encodeURIComponent(sparql) + "&format=json";

        try {
            const response = await fetch(url);
            const data = await response.json();
            const allCities = data.results.bindings.map((item) => {
                const imgUrl = item.image?.value || "";
                const city = item.cityLabel.value;
                const country = item.countryLabel.value;
                return {
                    id: city.toLowerCase().replace(/\s+/g, "-"),
                    name: city,
                    country: country,
                    image: imgUrl,
                };
            });

            const diversifiedCities = [];
            const countryCount = {};
            const maxPerCountry = 2;

            for (const city of allCities) {
                const country = city.country;
                countryCount[country] = countryCount[country] || 0;

                if (countryCount[country] < maxPerCountry) {
                    diversifiedCities.push(city);
                    countryCount[country]++;

                    if (diversifiedCities.length >= limit) {
                        break;
                    }
                }
            }

            return diversifiedCities;
        } catch (error) {
            console.error("Erreur lors de la requête Wikidata:", error);
            return [];
        }
    }

    async loadCityTags() {
        if (this.cityTagsLoaded) return this.cityTags || {};
        let baseTags = {};

        try {
            const travelData = await this.loadTravelData();
            if (travelData?.countries) {
                for (const [countryId, countryData] of Object.entries(travelData.countries)) {
                    if (countryData.places) {
                        countryData.places.forEach((place) => {
                            const key = place.id;
                            baseTags[key] = {
                                beach: place.type === "beach",
                                mountain: place.type === "nature",
                                vibe:
                                    place.type === "cultural"
                                        ? "culturelle"
                                        : place.type === "beach"
                                        ? "détente"
                                        : place.type === "nature"
                                        ? "aventure"
                                        : null,
                                neighbors: [],
                            };
                        });
                    }
                }
            }
        } catch (err) {
            console.warn("Impossible de charger travel-data.json pour les tags:", err);
        }

        const stored = JSON.parse(localStorage.getItem("cityTags") || "{}");
        this.cityTags = { ...baseTags, ...stored };
        this.cityTagsLoaded = true;
        return this.cityTags;
    }

    async getCityTags() {
        await this.loadCityTags();
        return this.cityTags || {};
    }

    saveCityTags(tags) {
        this.cityTags = { ...(this.cityTags || {}), ...(tags || {}) };
        try {
            localStorage.setItem("cityTags", JSON.stringify(this.cityTags));
        } catch (err) {
            console.error("Impossible de sauvegarder cityTags dans localStorage:", err);
        }
    }

    async enrichCitiesWithTags(cities = []) {
        const tags = await this.getCityTags();
        const newEntries = {};
        const normalized = (idOrName) =>
            String(idOrName || "")
                .toLowerCase()
                .replace(/\s+/g, "-")
                .replace(/[^a-z0-9\-]/g, "");

        const enriched = cities.map((city) => {
            const key = city.id ? normalized(city.id) : normalized(city.name);
            const existing = tags[key] || null;

            if (!existing) {
                newEntries[key] = {
                    beach: null,
                    mountain: null,
                    vibe: null,
                    neighbors: [],
                };
            }

            return {
                ...city,
                tags: existing || {
                    beach: null,
                    mountain: null,
                    vibe: null,
                    neighbors: [],
                },
                _tagKey: key,
            };
        });

        if (Object.keys(newEntries).length > 0) {
            const toSave = { ...(this.cityTags || {}) };
            for (const k of Object.keys(newEntries)) {
                if (!toSave[k]) toSave[k] = newEntries[k];
            }
            this.saveCityTags(toSave);
        }

        return enriched;
    }

    async getCountries() {
        if (this.useWikidata) {
            return {};
        }
        const data = await this.loadTravelData();
        return data?.countries || {};
    }

    async getCountry(countryId) {
        if (this.useWikidata) {
            return null;
        }
        const countries = await this.getCountries();
        return countries[countryId] || null;
    }

    async getDestinations(countryId) {
        if (this.useWikidata) {
            const items = await this.fetchWikidataCities({ limit: 20, minPopulation: 300000 });
            return await this.enrichCitiesWithTags(items);
        }

        const country = await this.getCountry(countryId);
        const places = country?.places || [];
        const enriched = await this.enrichCitiesWithTags(
            places.map((place) => ({
                ...place,
                country: country?.name || "",
                countryId: countryId,
            }))
        );
        return enriched;
    }

    async getAllDestinations() {
        if (this.useWikidata) {
            const items = await this.fetchWikidataCities({ limit: 80, minPopulation: 300000 });
            return await this.enrichCitiesWithTags(items);
        }

        const countries = await this.getCountries();
        const allDestinations = [];

        for (const [countryId, countryData] of Object.entries(countries)) {
            if (countryData.places) {
                countryData.places.forEach((place) => {
                    allDestinations.push({
                        ...place,
                        country: countryData.name,
                        countryId: countryId,
                    });
                });
            }
        }

        return await this.enrichCitiesWithTags(allDestinations);
    }

    async getDestinationsByType(type) {
        if (this.useWikidata) {
            const items = await this.fetchWikidataCities({ limit: 8, minPopulation: 200000 });
            return await this.enrichCitiesWithTags(items);
        }

        const allDestinations = await this.getAllDestinations();
        return allDestinations.filter((dest) => dest.type === type);
    }
}

const dataManager = new DataManager();

if (typeof module !== "undefined" && module.exports) {
    module.exports = DataManager;
} else {
    window.DataManager = DataManager;
    window.dataManager = dataManager;
}
