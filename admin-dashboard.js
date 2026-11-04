
import { createClient } from
    "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabaseUrl = "https://ukeujwvbjhkulvjcazjr.supabase.co";
const supabaseKey = "sb_publishable_9fDNrP010juQChk3u5KnVw_bGOa6NzS";

const supabase = createClient(supabaseUrl, supabaseKey);
// Load categories from Supabase
async function loadCategories() {
    const { data, error } = await supabase
        .from("categories")
        .select("name")
        .order("name");

    if (error) {
        document.getElementById("category-message").textContent =
            "Could not load categories.";
        return;
    }

    const categorySelect = document.getElementById("category");
    categorySelect.innerHTML =
        '<option value="">Choose a category</option>';

    data.forEach((category) => {
        const option = document.createElement("option");
        option.value = category.name;
        option.textContent = category.name;
        categorySelect.appendChild(option);
    });
}

// Add a new category
document.getElementById("add-category-btn")
    .addEventListener("click", async () => {
        const input = document.getElementById("new-category");
        const message = document.getElementById("category-message");
        const name = input.value.trim();

        if (!name) {
            message.textContent = "Please enter a category name.";
            return;
        }

        message.textContent = "Adding category...";

        const { error } = await supabase
            .from("categories")
            .insert([{ name }]);

        if (error) {
            message.textContent =
                error.code === "23505"
                    ? "This category already exists."
                    : "Could not add category. Please try again.";
            return;
        }

        input.value = "";
        message.textContent = "Category added successfully!";
        await loadCategories();
    });

loadCategories();
const form = document.getElementById("product-form");
const message = document.getElementById("message");
const productList = document.getElementById("product-list");
const logoutButton = document.getElementById("logout-button");

let currentUser = null;

// Check that the visitor is logged in and is an authorised admin
async function checkAdmin() {
    const { data: { user }, error } =
        await supabase.auth.getUser();

    if (error || !user) {
        window.location.href = "admin.html";
        return false;
    }

    const { data: admin, error: adminError } = await supabase
        .from("admin_users")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

    if (adminError || !admin) {
        await supabase.auth.signOut();
        window.location.href = "admin.html";
        return false;
    }

    currentUser = user;
    return true;
}

// Load all products
async function loadProducts() {
    productList.textContent = "Loading products...";

    const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        productList.textContent = "Could not load products.";
        return;
    }

    productList.replaceChildren();

    if (data.length === 0) {
        productList.textContent = "No products added yet.";
        return;
    }

    data.forEach((product) => {
        const item = document.createElement("div");
        item.className = "product";

        const image = document.createElement("img");
        image.src = product.image_url || "";
        image.alt = product.name;

        const info = document.createElement("div");
        info.className = "product-info";

        const name = document.createElement("strong");
        name.textContent = product.name;

        const details = document.createElement("p");
        details.textContent =
            product.category + " · ₹" + product.price;

        info.append(name, details);

        const editButton = document.createElement("button");
        editButton.textContent = "Edit";
        editButton.addEventListener("click", () => editProduct(product));

        const deleteButton = document.createElement("button");
        deleteButton.textContent = "Delete";
        deleteButton.className = "delete-button";
        deleteButton.addEventListener("click", () => deleteProduct(product));

        item.append(image, info, editButton, deleteButton);
        productList.append(item);
    });
}

// Add a new product and upload its image
form.addEventListener("submit", async (event) => {
    event.preventDefault();

    message.textContent = "Saving product...";

    const name = document.getElementById("name").value.trim();
    const price = Number(document.getElementById("price").value);
    const category = document.getElementById("category").value;
    const description =
        document.getElementById("description").value.trim();
    const file = document.getElementById("image").files[0];

    if (!file || !file.type.startsWith("image/")) {
        message.textContent = "Please choose a valid image.";
        return;
    }

    if (!Number.isFinite(price) || price <= 0) {
        message.textContent = "Please enter a valid price.";
        return;
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const imagePath = currentUser.id + "/" +
        crypto.randomUUID() + "-" + safeName;

    const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(imagePath, file);

    if (uploadError) {
        message.textContent = "Image upload failed: " + uploadError.message;
        return;
    }

    const { data: publicData } = supabase.storage
        .from("product-images")
        .getPublicUrl(imagePath);

    const { error } = await supabase
        .from("products")
        .insert({
            name,
            price,
            category,
            description,
            image_url: publicData.publicUrl
        });

    if (error) {
        await supabase.storage
            .from("product-images")
            .remove([imagePath]);

        message.textContent = "Could not save product: " + error.message;
        return;
    }

    form.reset();
    message.textContent = "Product added successfully!";
    await loadProducts();
});

// Edit product details
async function editProduct(product) {
    const name = prompt("Product name:", product.name);
    if (name === null) return;

    const priceText = prompt("Product price:", product.price);
    if (priceText === null) return;

    const price = Number(priceText);
    if (!name.trim() || !Number.isFinite(price) || price <= 0) {
        alert("Please enter a valid name and price.");
        return;
    }

    const category = prompt(
        "Category (Rings, Bracelets, Earrings, Necklaces):",
        product.category
    );
    if (category === null) return;

    const allowedCategories = [
        "Rings", "Bracelets", "Earrings", "Necklaces"
    ];

    if (!allowedCategories.includes(category)) {
        alert("Please enter one of the four valid categories.");
        return;
    }

    const description = prompt(
        "Product description:",
        product.description || ""
    );
    if (description === null) return;

    const { error } = await supabase
        .from("products")
        .update({
            name: name.trim(),
            price,
            category,
            description
        })
        .eq("id", product.id);

    if (error) {
        alert("Could not update product: " + error.message);
        return;
    }

    alert("Product updated!");
    await loadProducts();
}

// Delete product
async function deleteProduct(product) {
    const confirmed = confirm(
        "Are you sure you want to delete " + product.name + "?"
    );

    if (!confirmed) return;

    const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", product.id);

    if (error) {
        alert("Could not delete product: " + error.message);
        return;
    }

    alert("Product deleted!");
    await loadProducts();
}

// Logout
logoutButton.addEventListener("click", async () => {
    await supabase.auth.signOut();
    window.location.href = "admin.html";
});

// Start dashboard
const authorised = await checkAdmin();

if (authorised) {
    await loadProducts();
}
