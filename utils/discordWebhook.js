// Envoie un message vers un webhook Discord (alerte de capture shiny pour une shasse).
// Le runtime Node ici a `fetch` global (déjà utilisé dans scripts/backfillGenerationLegendaire.js),
// pas besoin d'ajouter une dépendance.
function renderTemplate(template, values) {
	return template.replace(/\{(\w+)\}/g, (match, key) => (key in values ? String(values[key]) : match));
}

async function sendShinyCaptureWebhook(webhookUrl, template, values) {
	const defaultTemplate = "✨ {pseudo} a trouvé {pokemon} shiny après {rencontres} rencontres ({methode}) !";
	const content = renderTemplate(template || defaultTemplate, values);

	try {
		const response = await fetch(webhookUrl, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ content }),
		});
		if (!response.ok) {
			console.error("Webhook Discord refusé :", response.status, await response.text());
		}
	} catch (error) {
		console.error("Erreur lors de l'envoi du webhook Discord :", error);
	}
}

module.exports = { sendShinyCaptureWebhook };
