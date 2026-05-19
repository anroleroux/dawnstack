async function populateAttributeRatingsWithGemini(idea) {
    const settings = getSettings();
    if (!settings.geminiApiKey || !settings.populateAttributeRatings) return;

    // Attributes this idea has no rating for yet
    const attrs = attrItems.list.filter(attr =>
        !attributeRatings.list.some(r => r.idea_id === idea.id && r.att_id === attr.id)
    );
    if (!attrs.length) return;

    const attrLines = attrs.map((a, i) => {
        const group = attributeGroups.list.find(g => g.id === a.att_group_id);
        return `${i + 1}. "${a.name}" (${group ? group.name : 'attribute'})${a.description ? ': ' + a.description : ''}`;
    }).join('\n');

    const prompt = `You are a strategic evaluator helping prioritize ideas based on personal strengths, wins, and weaknesses.

Rate how relevant this idea is to each attribute on a scale of 0 to 10:
0 = the idea has no connection to this attribute
10 = the idea directly leverages or is highly relevant to this attribute

Idea: "${idea.name}"${idea.description ? '\n' + idea.description : ''}

Rate this idea against these ${attrs.length} attributes:
${attrLines}

Return {"ratings": [...]} with exactly ${attrs.length} integers (0-10), one per attribute in the order listed.`;

    try {
        const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${settings.geminiApiKey}`,
            {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    contents: [{parts: [{text: prompt}]}],
                    generationConfig: {
                        thinkingConfig: {thinkingLevel: "LOW"},
                        responseMimeType: 'application/json',
                        responseSchema: {
                            type: 'OBJECT',
                            properties: {
                                ratings: {type: 'ARRAY', items: {type: 'NUMBER'}}
                            },
                            required: ['ratings']
                        }
                    }
                })
            }
        );
        if (!res.ok) {
            console.error('Gemini API error', res.status, await res.text());
            return;
        }
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) return;
        const result = JSON.parse(text);
        const ratings = result.ratings;
        if (!Array.isArray(ratings) || ratings.length !== attrs.length) {
            console.error('Gemini returned unexpected ratings length', ratings);
            return;
        }
        for (let i = 0; i < attrs.length; i++) {
            const score = Math.min(10, Math.max(0, Math.round(Number(ratings[i])) || 0));
            await createAttributeRating({idea_id: idea.id, att_id: attrs[i].id, score});
        }
        ideas._lv++;
        portfolioItems._lv++;
    } catch (err) {
        console.error('populateAttributeRatingsWithGemini failed:', err);
    }
}
