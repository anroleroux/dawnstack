async function populateAttributeRatingsWithGemini() {
    if (!testing) {  //testing
    const settings = getSettings();
    if (!settings.geminiApiKey || !settings.populateAttributeRatings) return;

    // Collect (idea, attribute) pairs that have no rating record yet
    const pairs = [];
    for (const idea of ideas.list) {
        for (const attr of attrItems.list) {
            if (!attributeRatings.list.some(r => r.idea_id === idea.id && r.att_id === attr.id)) {
                pairs.push({idea, attr});
            }
        }
    }
    if (!pairs.length) return;

    const uniqueIdeas = [...new Map(pairs.map(({idea}) => [idea.id, idea])).values()];
    const uniqueAttrs = [...new Map(pairs.map(({attr}) => [attr.id, attr])).values()];

    const ideaLines = uniqueIdeas.map(i =>
        `- "${i.name}"${i.description ? ': ' + i.description : ''}`
    ).join('\n');

    const attrLines = uniqueAttrs.map(a => {
        const group = attributeGroups.list.find(g => g.id === a.att_group_id);
        return `- "${a.name}" (${group ? group.name : 'attribute'})${a.description ? ': ' + a.description : ''}`;
    }).join('\n');

    const pairLines = pairs.map((p, i) =>
        `${i + 1}. Idea "${p.idea.name}" — attribute "${p.attr.name}"`
    ).join('\n');

    const prompt = `You are a strategic evaluator helping prioritize ideas based on personal strengths, wins, and weaknesses.

Rate how relevant each idea is to each attribute on a scale of 0 to 10:
0 = the idea has no connection to this attribute
10 = the idea directly leverages or is highly relevant to this attribute

Ideas:
${ideaLines}

Attributes:
${attrLines}

Rate these ${pairs.length} idea-attribute pairs in order:
${pairLines}

Return {"ratings": [...]} with exactly ${pairs.length} integers (0-10), one per pair in the order listed.`;

    try {
        const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${settings.geminiApiKey}`,
            {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    contents: [{parts: [{text: prompt}]}],
                    generationConfig: {
                        responseMimeType: 'application/json',
                        responseSchema: {
                            type: 'OBJECT',
                            properties: {
                                ratings: {type: 'ARRAY', items: {type: 'INTEGER'}}
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
        if (!Array.isArray(ratings) || ratings.length !== pairs.length) {
            console.error('Gemini returned unexpected ratings length', ratings);
            return;
        }
        for (let i = 0; i < pairs.length; i++) {
            const {idea, attr} = pairs[i];
            const score = Math.min(10, Math.max(0, Math.round(Number(ratings[i])) || 0));
            await createAttributeRatingRecord(idea.id, attr.id, score);
        }
        ideas._lv++;
        portfolioItems._lv++;
    } catch (err) {
        console.error('populateAttributeRatingsWithGemini failed:', err);
    }
    } //testing
}

async function createAttributeRatingRecord(ideaId, attId, score) {
    const data = {idea_id: ideaId, att_id: attId, score};
    let saved;
    if (!supabase) {
        const userId = getCurrentUserId();
        const headers = {'Content-Type': 'application/json'};
        if (userId) headers['X-User-Id'] = userId;
        const res = await fetch('/api/attribute-ratings', {method: 'POST', headers, body: JSON.stringify(data)});
        if (!res.ok) throw new Error('Failed to create attribute rating');
        saved = await res.json();
    } else {
        const res = await fetch(sbUrl('/api/attribute-ratings'), {method: 'POST', headers: sbHeaders(true), body: JSON.stringify(data)});
        if (!res.ok) throw new Error('Failed to create attribute rating');
        saved = (await res.json())[0];
    }
    attributeRatings.list.push(saved);
}
