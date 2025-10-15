document.addEventListener("DOMContentLoaded", () => {
    const wrapper = document.querySelector(".partenaire-container");

    let position = 0;

    let baseSpeed = 0.5;
    let isHovered = false;

    function animate() {
        if (!isHovered) {
            position -= baseSpeed;

            if (position <= -wrapper.scrollWidth / 2) {
                position = 0;
            }

            wrapper.style.transform = `translateX(${position}px)`;
        }

        requestAnimationFrame(animate);
    }

    wrapper.addEventListener("mouseenter", () => {
        isHovered = true;
    });

    wrapper.addEventListener("mouseleave", () => {
        isHovered = false;
    });

    animate();
});
