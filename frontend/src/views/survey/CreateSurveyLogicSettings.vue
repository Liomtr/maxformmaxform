<template>
    <!-- 题目关联弹窗（大众友好版，居中显示，Teleport到body避免被父级裁剪） -->
    <teleport to="body">
      <div v-if="showLogicDialog" class="logic-mask" @click.self="closeLogicDialog()">
        <div class="logic-dialog">
          <div class="logic-hd">
            <div class="logic-tt">题目关联逻辑</div>
            <button class="btn btn-link" @click="closeLogicDialog">✕</button>
          </div>
          <div class="logic-bd">
            <div class="logic-bar">
              <div class="logic-bar-title">当满足以下任意条件时，显示当前题目：</div>
            </div>
            <div v-for="(row, ri) in logicRows" :key="'row-'+ri" class="logic-rowbox q-logic-rowbox">
              <div class="logic-line">
                <span>如果</span>
                <select class="logic-select" v-model.number="row.depIdx">
                  <option v-for="(q2, qi) in (logicTargetIndex!=null? selectablePrevQs(logicTargetIndex):[])" :key="q2.id" :value="qi">第{{ qi+1 }}题：{{ q2.title || getQuestionTypeLabel(q2.type) }}</option>
                </select>
                <template v-if="(logicTargetIndex!=null? selectablePrevQs(logicTargetIndex):[])[row.depIdx]?.options?.length">
                  <span>选中了以下任意选项：</span>
                </template>
                <template v-else>
                  <select class="logic-select mini" v-model="row.op">
                    <option value="eq">等于</option>
                    <option value="neq">不等于</option>
                    <option value="gt">大于</option>
                    <option value="gte">大于等于</option>
                    <option value="lt">小于</option>
                    <option value="lte">小于等于</option>
                    <option value="includes">包含</option>
                    <option value="notIncludes">不包含</option>
                    <option value="regex">匹配正则</option>
                  </select>
                  <input class="logic-input" v-model="row.text" placeholder="请输入条件值" />
                </template>
                <button class="btn btn-link danger" @click="removeLogicRow(ri)" v-if="logicRows.length>1">删除</button>
              </div>
              <div class="chip-list" v-if="(logicTargetIndex!=null? selectablePrevQs(logicTargetIndex):[])[row.depIdx]?.options?.length">
                <span 
                  v-for="(opt, i) in ((logicTargetIndex!=null? selectablePrevQs(logicTargetIndex):[])[row.depIdx]?.options || [])" 
                  :key="i" 
                  class="chip" 
                  :class="{ active: (row.picked||[]).includes(String(opt)) }"
                  @click="togglePick(ri, String(opt))">
                  <span class="chip-text">{{ asPlain(opt) }}</span>
                  <span v-if="(row.picked||[]).includes(String(opt))" class="chip-x" @click.stop="togglePick(ri, String(opt))">×</span>
                </span>
              </div>
            </div>
            <button class="btn btn-link" @click="addLogicRow">+ 再加一条条件</button>
          </div>
          <div class="logic-ft">
            <div class="logic-left-block">
              <div class="logic-left-actions">
                  <button class="btn btn-link danger" @click="clearCurrentQuestionLogic">🗑 删除本题关联</button>
                <button class="btn btn-link danger" @click="clearAllLogicAssociations">🗑 删除所有题目关联</button>
              </div>
              <div class="logic-tip">说明：以下条件满足任意一条，本题就会显示。</div>
            </div>
            <div>
              <button class="btn btn-outline" @click="closeLogicDialog">取消</button>
              <button class="btn btn-primary" @click="saveLogicDialog">保存</button>
            </div>
          </div>
        </div>
      </div>
    </teleport>

    <!-- 选项关联弹窗（左侧当前题的选项，右侧为该选项的出现条件） -->
    <teleport to="body">
      <div v-if="showOptionDialog" class="logic-mask" @click.self="closeOptionDialog()">
        <div class="logic-dialog">
          <div class="logic-hd">
            <div class="logic-titlebar">
              <div class="logic-tt">选项关联逻辑</div>
              <div class="logic-subtip">说明：以下条件满足任意一条，该选项才会显示。</div>
            </div>
            <button class="btn btn-link" @click="closeOptionDialog">✕</button>
          </div>
          <div class="logic-bd">
            <div class="opt-logic-head">
              <div class="row1">
                当前题目：
                <span class="qname">
                  {{ optionTargetIndex!=null ? (surveyForm.questions[optionTargetIndex].title || getQuestionTypeLabel(surveyForm.questions[optionTargetIndex].type)) : '' }}
                </span>
              </div>
            </div>
            <div class="opt-logic-layout">
              <div class="opt-logic-left">
                <div class="opt-head">当前选项</div>
                <div class="opt-rows">
                  <div
                    v-for="(opt, i) in (optionTargetIndex!=null? (surveyForm.questions[optionTargetIndex].options||[]):[])"
                    :key="'left-opt-'+i"
                    :class="['opt-row', { active: i===activeOptIdx }]"
                    @click="onPickLeftOption(i)"
                  >
                    <div class="opt-title">{{ optionLabelPlain(opt, i) }}</div>
                    <div class="opt-actions">
                      <span class="opt-status" :class="{ on: hasOptionLogic(i) }">{{ hasOptionLogic(i) ? '已设置' : '未设置' }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div class="opt-logic-right">
                <div class="opt-head">选项出现条件</div>
                <div class="opt-rows">
                  <div class="logic-rowbox">
                    <div class="logic-line" style="flex-wrap:wrap; gap:10px 12px; align-items: baseline;">
                      <span class="label">正在编辑：</span>
                      <span class="badge">{{ optionLabelPlain((optionTargetIndex!=null? (surveyForm.questions[optionTargetIndex].options||[]):[])[activeOptIdx], activeOptIdx) }}</span>
                      <span class="summary-text" v-if="currentOptionSummary">（{{ currentOptionSummary }}）</span>
                      <button class="btn btn-link danger" @click="clearCurrentOptionLogic">🗑 清除此选项关联</button>
                    </div>
                  </div>

                  <div v-for="(row, ri) in optionLogicRows" :key="'oprow-'+ri" class="logic-rowbox">
                    <div class="logic-line">
                      <select class="logic-select" v-model.number="row.depIdx">
                        <option v-for="(q2, qi) in (optionTargetIndex!=null? selectablePrevQs(optionTargetIndex):[])" :key="'dep-'+qi" :value="qi">第{{ qi+1 }}题：{{ q2.title || getQuestionTypeLabel(q2.type) }}</option>
                      </select>

                      <template v-if="(optionTargetIndex!=null? selectablePrevQs(optionTargetIndex):[])[row.depIdx]?.options?.length">
                        <div class="chip-list">
                          <span
                            class="chip"
                            v-for="(opt, i) in ((optionTargetIndex!=null? selectablePrevQs(optionTargetIndex):[])[row.depIdx]?.options || [])"
                            :key="'v-'+i"
                            :class="{ active: (row.picked||[]).includes(String(opt)) }"
                            @click="toggleOptionPick(ri, String(opt))"
                          >{{ asPlain(opt) }}</span>
                        </div>
                      </template>
                      <template v-else>
                        <select class="logic-select mini" v-model="row.op">
                          <option value="eq">等于</option>
                          <option value="neq">不等于</option>
                          <option value="gt">大于</option>
                          <option value="gte">大于等于</option>
                          <option value="lt">小于</option>
                          <option value="lte">小于等于</option>
                          <option value="regex">匹配正则</option>
                        </select>
                        <input class="logic-input" v-model="row.text" placeholder="请输入条件值" />
                      </template>

                      <button class="btn btn-link danger" @click="removeOptionLogicRow(ri)" v-if="optionLogicRows.length>1">删除</button>
                    </div>
                  </div>
                  <div class="right-actions-line">
                    <button class="btn btn-link" @click="addOptionLogicRow">+ 再加一条条件</button>
                    <button class="btn btn-primary btn-sm" @click="saveOptionDialogOne">确定</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="logic-ft">
            <div class="logic-left-block">
              <div class="logic-left-actions">
                <button class="btn btn-link danger" @click="clearAllOptionLogicForThisQuestion">🗑 清空本题全部关联</button>
              </div>
              <label class="checkbox-mini" style="margin-top:6px;">
                <input type="checkbox" v-model="(surveyForm.questions[optionTargetIndex||0] as any).autoSelectOnAppear" />
                选项出现时默认选中（设置了选项关联）
              </label>
              
            </div>
            <div>
              <button class="btn btn-outline" @click="closeOptionDialog">取消</button>
              <button class="btn btn-primary" @click="saveOptionDialog">保存</button>
            </div>
          </div>
        </div>
      </div>
    </teleport>

    <!-- 跳题逻辑弹窗 -->
    <teleport to="body">
      <div v-if="showJumpDialog" class="logic-mask" @click.self="closeJumpDialog()">
        <div class="logic-dialog jump-dialog">
          <div class="logic-hd">
            <div class="logic-tt">跳题逻辑</div>
            <button class="btn btn-link" @click="closeJumpDialog">✕</button>
          </div>
          <div class="logic-bd">
            <div class="logic-bar">
              <label class="checkbox-mini">
                <input type="checkbox" v-model="jumpByOptionEnabled" /> 按选项跳题
              </label>
            </div>
            <div v-if="jumpByOptionEnabled" class="jump-table">
              <div class="jump-head">
                <div class="col col-a">选择</div>
                <div class="col col-b">选项</div>
                <div class="col col-c">跳转到</div>
              </div>
              <div class="jump-body">
                <div class="jump-row" v-for="(opt, i) in (jumpTargetIndex!=null ? (surveyForm.questions[jumpTargetIndex].options || []) : [])" :key="'jp-'+i">
                  <div class="col col-a"><span class="radio-circle">○</span></div>
                  <div class="col col-b">{{ asPlain(opt || ('选项'+(i+1))) }}</div>
                  <div class="col col-c">
                    <select class="logic-select" v-model="jumpByOption[String(i+1)]">
                      <option value="">不跳转，继续回答下一题</option>
                      <option v-for="(q2, qi) in surveyForm.questions" :key="'to-'+qi" :value="String(qi+1)" :disabled="qi <= (jumpTargetIndex||0)">跳转到 第{{ qi+1 }}题：{{ q2.title || getQuestionTypeLabel(q2.type) }}</option>
                      <option value="end">跳到问卷末尾结束作答</option>
                      <option value="invalid">直接提交为无效问卷</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <el-divider />
            <label class="checkbox-mini" style="display:block;margin-bottom:8px;">
              <input type="checkbox" v-model="jumpUnconditionalEnabled" /> 无条件跳题
            </label>
            <div v-if="jumpUnconditionalEnabled" class="logic-rowbox">
              <div class="logic-line">
                <span class="logic-bar-title">填写此题后跳转到</span>
                <select class="logic-select wide" v-model="jumpUnconditionalTarget">
                  <option value="">请选择要跳转到的题目</option>
                  <option v-for="(q2, qi) in surveyForm.questions" :key="'uto-'+qi" :value="String(qi+1)" :disabled="qi <= (jumpTargetIndex||0)">跳转到 第{{ qi+1 }}题：{{ q2.title || getQuestionTypeLabel(q2.type) }}</option>
                  <option value="end">跳到问卷末尾结束作答</option>
                  <option value="invalid">直接提交为无效问卷</option>
                </select>
              </div>
            </div>
          </div>
          <div class="logic-ft">
            <div>
              <div class="tip-muted">
                <div>提示：跳题逻辑适用于控制答题路径（例如调查问卷末尾），筛选无效人群。</div>
                <div>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;若需要控制题目显示/隐藏，请使用 题目关联。</div>
              </div>
            </div>
            <div>
              <button class="btn btn-outline" @click="closeJumpDialog">取消</button>
              <button class="btn btn-primary" @click="saveJumpDialog">确定</button>
            </div>
          </div>
        </div>
      </div>
    </teleport>

  <!-- 通用富文本编辑对话框实例（页面级，按需打开） -->
  <QuillRichTextDialog
    v-model="showRteDialog"
    v-model:content="rteContent"
    title="编辑选项富文本"
    :max-length="2000"
    limit-mode="block"
    @confirm="applyRteContent"
  />
  <!-- 标题富文本编辑对话框 -->
  <QuillRichTextDialog
    v-model="showTitleRte"
    v-model:content="titleRteContent"
    title="编辑标题富文本"
    :max-length="2000"
    limit-mode="block"
    @confirm="applyTitleRteContent"
  />
  <!-- 问卷说明已改为内联富文本，不再使用弹窗 -->

  <!-- 批量添加题目 -->
  <teleport to="body">
    <div v-if="showBatchAddDialog" class="logic-mask" @click.self="closeBatchAddDialog">
      <div class="logic-dialog batch-add-questions-dialog">
        <div class="logic-hd">
          <div class="logic-tt">批量添加</div>
          <button class="btn btn-link" @click="closeBatchAddDialog">✕</button>
        </div>
        
        <!-- 标签页切换 -->
        <div class="batch-tabs">
          <button 
            class="batch-tab" 
            :class="{ active: batchAddTab === 'manual' }"
            @click="batchAddTab = 'manual'"
          >
            导入示例题目
          </button>
          <button 
            class="batch-tab" 
            :class="{ active: batchAddTab === 'paste' }"
            @click="batchAddTab = 'paste'"
          >
            清空文本框
          </button>
          <button class="batch-tab-help" title="帮助说明">
            <el-icon><QuestionFilled /></el-icon>
          </button>
          <a href="#" class="batch-tab-link">查找问卷题单入问卷</a>
        </div>
        
        <!-- 左右分栏布局 -->
        <div class="batch-add-content">
          <!-- 左侧：输入区 -->
          <div class="batch-add-left">
            <!-- 文本输入区 -->
            <div class="batch-add-textarea-wrapper">
              <textarea 
                v-model="batchAddText" 
                class="batch-add-textarea" 
                placeholder="请将准备好的文档复制粘贴到这里&#10;&#10;格式说明：&#10;1、题目与题目之间需要一行，题目可以不加题号；题号中间不得填我号&#10;2、题干与选项，及各选项之间需回车换行，选项不得以数字开头（会被识别为题干）&#10;3、题目无选项直接空一行，会默认识别为文本型题目"
              ></textarea>
            </div>
          </div>
          
          <!-- 右侧：实时预览 -->
          <div class="batch-add-right">
            <div class="preview-header">
              <span class="preview-title">预览</span>
              <span class="preview-count">{{ parsedQuestions.length }} 个题目</span>
            </div>
            <div class="preview-content">
              <div v-if="parsedQuestions.length === 0" class="preview-empty">
                <div class="empty-icon">📝</div>
                <div class="empty-text">在左侧输入题目后，这里将显示预览</div>
              </div>
              <div v-else class="preview-list">
                <div 
                  v-for="(q, index) in parsedQuestions" 
                  :key="index" 
                  class="preview-question-item"
                >
                  <div class="preview-q-number">{{ index + 1 }}</div>
                  <div class="preview-q-content">
                    <div class="preview-q-title">{{ q.title }}</div>
                    <div v-if="q.options && q.options.length > 0" class="preview-q-options">
                      <div 
                        v-for="(opt, optIndex) in q.options" 
                        :key="optIndex"
                        class="preview-q-option"
                      >
                        <span class="option-marker">{{ String.fromCharCode(65 + optIndex) }}.</span>
                        <span class="option-text">{{ opt }}</span>
                      </div>
                    </div>
                    <div v-else class="preview-q-type">
                      <span class="type-badge">文本题</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 底部按钮 -->
        <div class="logic-ft batch-add-footer">
          <div class="batch-add-left">
            <button class="btn-text-link" @click="showAISuggestion">AI自动生成答案</button>
          </div>
          <div class="batch-add-right">
            <button class="btn btn-primary btn-import" @click="saveBatchAddQuestions">
              确定导入
            </button>
          </div>
        </div>
      </div>
    </div>
  </teleport>

  <!-- 批量编辑选项 -->
  <teleport to="body">
    <div v-if="showBatchDialog" class="logic-mask" @click.self="closeBatchDialog()">
      <div class="logic-dialog batch-dialog">
        <div class="logic-hd">
          <div class="logic-tt">批量编辑选项</div>
          <button class="btn btn-link" @click="closeBatchDialog">✕</button>
        </div>
        <div class="logic-bd batch-body">
          <div class="batch-left">
            <textarea v-model="batchText" class="batch-textarea" placeholder="每行一个选项；空行自动忽略；可直接粘贴Excel的一列" rows="18"></textarea>
            <div class="tip-muted" style="margin-top:8px;">共 {{ batchLineCount }} 行</div>
          </div>
          <div class="batch-right">
            <div class="preset-title">预设选项</div>
            <div class="preset-list">
              <button class="chip" v-for="p in presetNames" :key="p" @click="usePreset(p)">{{ p }}</button>
            </div>
          </div>
        </div>
        <div class="logic-ft">
          <div class="tip-muted">保存后将覆盖当前题目的选项；原有“选项关联/跳题(按选项)”会被清理。</div>
          <div>
            <button class="btn btn-outline" @click="closeBatchDialog">取消</button>
            <button class="btn btn-primary" @click="saveBatchEdit">确定</button>
          </div>
        </div>
      </div>
    </div>
  </teleport>

  <!-- 分组设置 -->
  <teleport to="body">
    <div v-if="showGroupDialog" class="logic-mask" @click.self="closeGroupDialog">
      <div class="logic-dialog group-dialog">
        <div class="logic-hd">
          <div class="logic-tt">分组设置</div>
          <button class="btn btn-link" @click="closeGroupDialog">✕</button>
        </div>
        <div class="logic-bd">
          <div v-if="!groupRows.length" style="text-align:center;color:#64748b;padding:40px 0;">
            还没有分组，赶快添加吧~
            <div class="add-group-center" style="margin-top:16px;"><button class="btn btn-primary add-group-btn" @click="addGroupRow">+ 添加分组</button></div>
          </div>
          <div v-else class="group-table">
            <div class="group-head">
              <div class="col name">分组名称</div>
              <div class="col range">组内选项</div>
              <div class="col rnd">是否随机</div>
            </div>
            <div class="group-row" v-for="(g, gi) in groupRows" :key="'gr-'+gi">
              <div class="col name">
                <span class="gname" @click="editGroupName(gi)">{{ g.name || ('分组'+(gi+1)) }}</span>
                <div class="name-actions">
                  <el-tooltip effect="dark" content="重命名" placement="top" :show-after="200">
                    <button class="btn-icon-mini" @click="editGroupName(gi)"><EditPen class="icon-mini" /></button>
                  </el-tooltip>
                  <el-tooltip effect="dark" content="删除" placement="top" :show-after="200">
                    <button class="btn-icon-mini danger" @click="removeGroupRow(gi)"><Remove class="icon-mini" /></button>
                  </el-tooltip>
                </div>
              </div>
              <div class="col range">
                <select v-model.number="g.from" :class="['logic-select','mini', { invalid: (g.to>0 && g.from>0 && g.to < g.from) }]" @change="normalizeGroupRow(gi)">
                  <option :value="0">请选择</option>
                  <option v-for="(o, i) in (groupSourceOptions||[])" :key="'f-'+i" :value="i+1" :title="asPlain(o)" :disabled="(i+1) < minStartFor(gi)">{{ (i+1) + '：' + (asPlain(o) || ('选项'+(i+1))) }}</option>
                </select>
                <span style="margin:0 6px;">到</span>
                <select v-model.number="g.to" :class="['logic-select','mini', { invalid: (g.to>0 && g.from>0 && g.to < g.from) }]" @change="normalizeGroupRow(gi)">
                  <option :value="0">请选择</option>
                  <option v-for="(o, i) in (groupSourceOptions||[])" :key="'t-'+i" :value="i+1" :title="asPlain(o)" :disabled="(i+1) < Math.max(minStartFor(gi), g.from || minStartFor(gi))">{{ (i+1) + '：' + (asPlain(o) || ('选项'+(i+1))) }}</option>
                </select>
                <div v-if="g.to>0 && g.from>0 && g.to < g.from" class="range-error">范围有误：结束不得小于开始</div>
                <div v-else-if="minStartFor(gi) > 1 && (g.from||0) < minStartFor(gi)" class="range-tip">提示：本组起始至少为 第{{ minStartFor(gi) }}项</div>
              </div>
              <div class="col rnd">
                <el-switch v-model="g.random" size="small" />
              </div>
            </div>
            <div class="add-group-center" style="margin-top:12px;"><button class="btn btn-primary add-group-btn" @click="addGroupRow">+ 添加分组</button></div>
          </div>
          <div class="tip-muted" style="margin-top:10px;">
            在分组名称前加“#”号可不向作答者展示分组名称，如“#分组一”。
          </div>
          <div class="tip-muted" style="margin-top:6px;">如果开启“分组顺序随机”，则分组显示顺序随机。</div>
        </div>
        <div class="logic-ft">
          <div class="logic-left-actions">
            <label class="checkbox-mini"><input type="checkbox" v-model="groupOrderRandom" /> 分组顺序随机</label>

          </div>
          <div>
            <button class="btn btn-outline" @click="closeGroupDialog">取消</button>
            <button class="btn btn-primary" @click="saveGroupDialog">确定</button>
          </div>
        </div>
      </div>
      <!-- 分组名称子弹窗 -->
      <div v-if="showGroupNameDialog" class="logic-submask" @click.self="cancelGroupName">
        <div class="logic-dialog" style="width: 460px;">
          <div class="logic-hd">
            <div class="logic-tt">分组名称</div>
            <button class="btn btn-link" @click="cancelGroupName">✕</button>
          </div>
          <div class="logic-bd">
            <input v-model="groupNameInput" class="logic-input" placeholder="请输入分组名称，如：分组1" style="width:100%;" />
            <div class="tip-muted" style="margin-top:8px;">在分组名称前加“#”号可不向作答者展示分组名称，如“#分组一”。</div>
          </div>
          <div class="logic-ft" style="justify-content:flex-end;">
            <button class="btn btn-outline" @click="cancelGroupName">取消</button>
            <button class="btn btn-primary" @click="confirmGroupName">确定</button>
          </div>
        </div>
      </div>
    </div>
  </teleport>

  <!-- 配额设置 -->
  <teleport to="body">
    <div v-if="showQuotaDialog" class="logic-mask" @click.self="closeQuotaDialog">
      <div class="logic-dialog group-dialog">
        <div class="logic-hd">
          <div class="logic-tt">配额设置</div>
          <div class="hd-right" style="display:flex; align-items:center; gap:10px;">
            <label class="tip-muted" style="font-size:12px;">启用配额</label>
            <el-switch v-model="quotaEnabled" size="small" />
            <button class="btn btn-link" @click="closeQuotaDialog">✕</button>
          </div>
        </div>
        <div class="logic-bd">
          <el-tabs v-model="quotaActiveTab">
            <el-tab-pane label="数量设置" name="count">
              <div class="tip-muted" style="margin-bottom:10px; display:flex; justify-content:space-between; align-items:center; gap:8px;">
                <div>
                  为每个选项设置可被选择的名额。选项每次被选择并成功提交后，将减少1个名额；名额为0时该选项不可再被选择。
                  <a href="#" @click.prevent="showQuotaExample">示例</a>
                </div>
                <div class="quota-actions">
                  <button class="btn btn-link-sm" @click="quotaClearAll" :disabled="!quotaEnabled">清零</button>
                  <i class="divider" aria-hidden="true"></i>
                  <button class="btn btn-link-sm" @click="quotaBatchIncrease(1)" :disabled="!quotaEnabled">全部+1</button>
                  <button class="btn btn-link-sm" @click="quotaBatchIncrease(10)" :disabled="!quotaEnabled">+10</button>
                </div>
              </div>
              <div class="quota-table quota-scroll">
                <div class="quota-head sticky">
                  <div class="col name">选项</div>
                  <div class="col limit">名额</div>
                  <div class="col on">启用</div>
                </div>
                <div class="quota-row" v-for="(r, i) in quotaRows" :key="'qr-'+i">
                  <div class="col name" :title="asPlain(r.label)">
                    <span class="text-ellipsis">{{ asPlain(r.label) || ('选项'+(i+1)) }}</span>
                  </div>
                  <div class="col limit">
                    <input class="logic-input mini right" type="number" min="0" step="1"
                      v-model.number="r.quotaLimit"
                      @input="sanitizeQuota(i)"
                      :disabled="!quotaEnabled || !r.quotaEnabled"
                      placeholder="0（不限）" />
                  </div>
                  <div class="col on">
                    <el-switch v-model="r.quotaEnabled" size="small" :disabled="!quotaEnabled" />
                  </div>
                </div>
              </div>
              <div class="tip-muted" style="margin-top:8px;">总名额（不含不限）：{{ quotaTotal }}</div>
            </el-tab-pane>
            <el-tab-pane label="提示信息" name="tips">
              <div class="quota-tips">
                <div class="row">
                  <label class="form-label" style="min-width:72px;">配额模式</label>
                  <el-radio-group v-model="quotaMode">
                    <el-radio label="explicit">显性配额（作答过程中禁选已满）</el-radio>
                    <el-radio label="implicit">隐性配额（提交后检查，超限记为无效）</el-radio>
                  </el-radio-group>
                </div>
                <div class="row" v-if="quotaMode==='explicit'">
                  <label class="form-label" style="min-width:72px;">提示文案</label>
                  <el-input v-model="quotaFullText" placeholder="配额已满（限10字）" maxlength="20" show-word-limit style="width:280px;" />
                </div>
                <div class="row" v-if="quotaMode==='explicit'">
                  <label class="form-label" style="min-width:72px;">显示余量</label>
                  <el-switch v-model="quotaShowRemaining" />
                </div>
              </div>
            </el-tab-pane>
          </el-tabs>
        </div>
        <div class="logic-ft">
          <div></div>
          <div>
            <button class="btn btn-outline" @click="closeQuotaDialog">取消</button>
            <button class="btn btn-primary" @click="saveQuotaDialog">确定</button>
          </div>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script setup lang="ts">
import type { CreateSurveyLogicSettingsContract } from './createSurveyPageContracts'
import { QuestionFilled, EditPen, Remove } from '@element-plus/icons-vue'
import QuillRichTextDialog from '@/components/QuillRichTextDialog.vue'
import './createSurveyPage.css'

const props = defineProps<{
  context: CreateSurveyLogicSettingsContract
}>()

const {
  showLogicDialog,
  closeLogicDialog,
  logicRows,
  logicTargetIndex,
  selectablePrevQs,
  getQuestionTypeLabel,
  togglePick,
  removeLogicRow,
  addLogicRow,
  clearCurrentQuestionLogic,
  clearAllLogicAssociations,
  saveLogicDialog,
  showOptionDialog,
  closeOptionDialog,
  optionTargetIndex,
  surveyForm,
  activeOptIdx,
  onPickLeftOption,
  optionLabelPlain,
  hasOptionLogic,
  currentOptionSummary,
  clearCurrentOptionLogic,
  optionLogicRows,
  toggleOptionPick,
  removeOptionLogicRow,
  addOptionLogicRow,
  saveOptionDialogOne,
  clearAllOptionLogicForThisQuestion,
  saveOptionDialog,
  showJumpDialog,
  closeJumpDialog,
  jumpByOptionEnabled,
  jumpTargetIndex,
  asPlain,
  jumpByOption,
  jumpUnconditionalEnabled,
  jumpUnconditionalTarget,
  saveJumpDialog,
  showRteDialog,
  rteContent,
  applyRteContent,
  showTitleRte,
  titleRteContent,
  applyTitleRteContent,
  showBatchAddDialog,
  closeBatchAddDialog,
  batchAddTab,
  batchAddText,
  parsedQuestions,
  showAISuggestion,
  saveBatchAddQuestions,
  showBatchDialog,
  closeBatchDialog,
  batchText,
  batchLineCount,
  presetNames,
  usePreset,
  saveBatchEdit,
  showGroupDialog,
  closeGroupDialog,
  groupRows,
  addGroupRow,
  editGroupName,
  removeGroupRow,
  groupSourceOptions,
  minStartFor,
  normalizeGroupRow,
  groupOrderRandom,
  saveGroupDialog,
  showGroupNameDialog,
  cancelGroupName,
  groupNameInput,
  confirmGroupName,
  showQuotaDialog,
  closeQuotaDialog,
  quotaEnabled,
  quotaActiveTab,
  showQuotaExample,
  quotaClearAll,
  quotaBatchIncrease,
  quotaRows,
  sanitizeQuota,
  quotaTotal,
  quotaMode,
  quotaFullText,
  quotaShowRemaining,
  saveQuotaDialog
} = props.context
</script>
