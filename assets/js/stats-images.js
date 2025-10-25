async function getFirstCityImages(limit = 4) {
    try {
        if (!window.dataManager?.fetchWikidataCities) {
            throw new Error("fetchWikidataCities non disponible");
        }

        const cities = await window.dataManager.fetchWikidataCities({ limit: limit * 3, minPopulation: 500000 });

        const uniqueCities = cities
            .filter((city) => city.image && city.image.trim() !== "")
            .filter((city, index, arr) => arr.findIndex((c) => c.name === city.name) === index)
            .slice(0, limit)
            .map((city) => ({
                name: city.name,
                country: city.country,
                image: city.image,
            }));

        return uniqueCities;
    } catch (error) {
        console.error("Erreur lors de la récupération des images de villes:", error);
        return [];
    }
}

document.addEventListener("DOMContentLoaded", async function () {
    const container = document.querySelector(".stats .images");
    if (!container) return;

    let images = [];

    try {
        const cityData = await getFirstCityImages(4);
        images = cityData.map((city) => city.image);
    } catch (err) {
        console.warn("API failed, using fallback");
    }

    if (images.length === 0) return;

    const img = document.createElement("img");
    img.src = images[0];
    container.appendChild(img);

    let index = 0;
    setInterval(() => {
        index = (index + 1) % images.length;
        img.src = images[index];
    }, 5000);
});

window.getFirstCityImages = getFirstCityImages;
