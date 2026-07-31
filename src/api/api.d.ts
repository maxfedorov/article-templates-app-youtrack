import { ExtractRPCFromHandler } from "../backend/types/utility";
import * as articleApplyTemplatePOSTHandler from "../backend/router/article/apply-template/POST";
import * as articleArticleDataGETHandler from "../backend/router/article/article-data/GET";
import * as globalAuthorFilterPOSTHandler from "../backend/router/global/author-filter/POST";
import * as globalBulkDeleteTemplatesPOSTHandler from "../backend/router/global/bulk-delete-templates/POST";
import * as globalBulkRestoreTemplatesPOSTHandler from "../backend/router/global/bulk-restore-templates/POST";
import * as globalCreateDraftPOSTHandler from "../backend/router/global/create-draft/POST";
import * as globalDeletedTemplatesGETHandler from "../backend/router/global/deleted-templates/GET";
import * as globalImportPredefinedTemplatesPOSTHandler from "../backend/router/global/import-predefined-templates/POST";
import * as globalPermanentTemplateDELETEHandler from "../backend/router/global/permanent-template/DELETE";
import * as globalProjectFilterPOSTHandler from "../backend/router/global/project-filter/POST";
import * as globalRestoreTemplatePOSTHandler from "../backend/router/global/restore-template/POST";
import * as globalSettingsGETHandler from "../backend/router/global/settings/GET";
import * as globalTemplateUsagePOSTHandler from "../backend/router/global/template-usage/POST";
import * as globalTemplatesDELETEHandler from "../backend/router/global/templates/DELETE";
import * as globalTemplatesGETHandler from "../backend/router/global/templates/GET";
import * as globalTemplatesPOSTHandler from "../backend/router/global/templates/POST";
import * as globalToggleFavoritePOSTHandler from "../backend/router/global/toggle-favorite/POST";
import * as globalToggleShowFavoritesPOSTHandler from "../backend/router/global/toggle-show-favorites/POST";
import * as globalUserPreferencesGETHandler from "../backend/router/global/user-preferences/GET";

export type ApiRouter = {
    article: {
        'apply-template': {
            POST: ExtractRPCFromHandler<articleApplyTemplatePOSTHandler.Handle>;
        };
        'article-data': {
            GET: ExtractRPCFromHandler<articleArticleDataGETHandler.Handle>;
        };
    };
    global: {
        'author-filter': {
            POST: ExtractRPCFromHandler<globalAuthorFilterPOSTHandler.Handle>;
        };
        'bulk-delete-templates': {
            POST: ExtractRPCFromHandler<globalBulkDeleteTemplatesPOSTHandler.Handle>;
        };
        'bulk-restore-templates': {
            POST: ExtractRPCFromHandler<globalBulkRestoreTemplatesPOSTHandler.Handle>;
        };
        'create-draft': {
            POST: ExtractRPCFromHandler<globalCreateDraftPOSTHandler.Handle>;
        };
        'deleted-templates': {
            GET: ExtractRPCFromHandler<globalDeletedTemplatesGETHandler.Handle>;
        };
        'import-predefined-templates': {
            POST: ExtractRPCFromHandler<globalImportPredefinedTemplatesPOSTHandler.Handle>;
        };
        'permanent-template': {
            DELETE: ExtractRPCFromHandler<globalPermanentTemplateDELETEHandler.Handle>;
        };
        'project-filter': {
            POST: ExtractRPCFromHandler<globalProjectFilterPOSTHandler.Handle>;
        };
        'restore-template': {
            POST: ExtractRPCFromHandler<globalRestoreTemplatePOSTHandler.Handle>;
        };
        settings: {
            GET: ExtractRPCFromHandler<globalSettingsGETHandler.Handle>;
        };
        'template-usage': {
            POST: ExtractRPCFromHandler<globalTemplateUsagePOSTHandler.Handle>;
        };
        templates: {
            DELETE: ExtractRPCFromHandler<globalTemplatesDELETEHandler.Handle>;
            GET: ExtractRPCFromHandler<globalTemplatesGETHandler.Handle>;
            POST: ExtractRPCFromHandler<globalTemplatesPOSTHandler.Handle>;
        };
        'toggle-favorite': {
            POST: ExtractRPCFromHandler<globalToggleFavoritePOSTHandler.Handle>;
        };
        'toggle-show-favorites': {
            POST: ExtractRPCFromHandler<globalToggleShowFavoritesPOSTHandler.Handle>;
        };
        'user-preferences': {
            GET: ExtractRPCFromHandler<globalUserPreferencesGETHandler.Handle>;
        };
    };
};
