document.querySelectorAll(".group").forEach(function (group) {
    group.addEventListener("mouseenter", function () {
        let icons = group.querySelectorAll(".js-button-icon");
        let arrows = group.querySelectorAll(".js-button-arrow-icon-primary");

        icons.forEach(function (e) {
            e.style.transition = "transform 0.6s cubic-bezier(0.68, 1.55)";
            e.style.transform = "translateX(15px) rotate(45deg)";
        });

        arrows.forEach(function (e) {
            e.style.transition = "transform 0.6s cubic-bezier(0.68, 1.55)";
            e.style.transform = "translateX(15px)";
        });
    });

    group.addEventListener("mouseleave", function () {
        let icons = group.querySelectorAll(".js-button-icon");
        let arrows = group.querySelectorAll(".js-button-arrow-icon-primary");

        icons.forEach(function (e) {
            e.style.transition = "transform 0.3s ease-out";
            e.style.transform = "translateX(0) rotate(0deg)";
        });

        arrows.forEach(function (e) {
            e.style.transition = "transform 0.3s ease-out";
            e.style.transform = "translateX(0)";
        });
    });
});
