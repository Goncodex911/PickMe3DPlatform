const HIDDEN_REVIEW_STATES = Object.freeze(['DRAFT', 'PENDING_REVIEW', 'REJECTED', 'TAKEN_DOWN']);

// Data needed for preview is retained; design source and editor-only metadata are removed.
const PREVIEW_ITEM_DROP = ['note', 'noteHistory', 'actions', 'animationHtml', 'animationJs', 'animationCss', 'html', 'js', 'code', 'prompt'];
const PREVIEW_DOC_DROP = ['promptEdit', 'promptOptions', 'brief'];

function previewOnlyDoc(docData) {
  if (!docData || typeof docData !== 'object') return null;
  const doc = { ...docData };
  for (const key of PREVIEW_DOC_DROP) delete doc[key];
  doc.groups = Array.isArray(docData.groups)
    ? docData.groups.map((group) => ({
        ...group,
        items: Array.isArray(group.items)
          ? group.items.map((item) => {
              const clean = { ...item };
              for (const key of PREVIEW_ITEM_DROP) delete clean[key];
              return clean;
            })
          : [],
      }))
    : [];
  doc.frames = Array.isArray(docData.frames) ? docData.frames.map(({ note, ...frame }) => frame) : [];
  return doc;
}

function publicCreatorTemplateFilter(authorId) {
  return {
    author: authorId,
    isPublic: true,
    reviewStatus: { $nin: HIDDEN_REVIEW_STATES },
  };
}

function sanitizePublicTemplate(template) {
  const plain = template.toObject ? template.toObject() : { ...template };
  if (Number(plain.price || 0) > 0 || plain.isPaid) {
    plain.docData = previewOnlyDoc(plain.docData);
    plain.previewOnly = true;
  }
  return plain;
}

module.exports = {
  HIDDEN_REVIEW_STATES,
  previewOnlyDoc,
  publicCreatorTemplateFilter,
  sanitizePublicTemplate,
};
