import unittest
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))
from app.routers.labs import list_labs, get_lab_detail, get_lab_variant, verify_student_solution
from app.routers.auth import login, LoginRequest
from app.routers.dsp import (
    generate_1d_signal, get_filter_response, process_image, get_conv_animation,
    analyze_speech, knn_classify, execute_matlab_code,
    SignalGenRequest, FilterRequest, ImageProcessRequest, ConvAnimRequest, KNNClassifyRequest, MatlabExecuteRequest
)
from app.routers.questions import get_lab_questions, check_answer, AnswerCheckRequest
from app.routers.teacher import (
    get_students, get_teacher_stats, get_student_progress,
    get_teacher_assignments, create_assignment, get_assignment_submissions,
    grade_assignment_submission, get_attendance_for_date, mark_attendance_batch,
    export_journal_csv, AssignmentCreateRequest, GradeAssignmentRequest, AttendanceBatchRequest, AttendanceRecordItem
)
from app.routers.assignments import get_my_assignments, submit_assignment_solution, SubmitAssignmentRequest
from app.routers.ai import ai_chat, fix_code_error, analyze_metrics, AIChatRequest, AIFixRequest, AIAnalyzeRequest
from app.routers.admin import (
    get_all_users, get_ai_settings, test_ai_connection, get_system_health,
    get_audit_logs, export_backup_json
)
from app.routers.notifications import (
    get_user_notifications, mark_notification_read, mark_all_read,
    get_unread_count
)
from app.routers.cms import (
    get_all_cms_labs, get_cms_lab_detail, save_cms_lab_detail, LabContentUpdateRequest
)
from app.routers.teacher import (
    check_report_plagiarism, return_report_for_revision, import_students_csv,
    ReportReturnRequest, StudentBatchImportRequest, StudentCreateRequest
)
from app.models.schemas import User
from sqlmodel import select
from app.db.session import engine, Session, init_db

class TestBackendComprehensive(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()

    def test_labs_all_20(self):
        with Session(engine) as session:
            labs = list_labs(user=None, session=session)
            self.assertEqual(len(labs), 20)

    def test_image_processing_filter(self):
        req = ImageProcessRequest(image_name="cameraman", operation="filter", filter_type="median", noise_type="salt_pepper")
        res = process_image(req)
        self.assertIn("data:image/png;base64,", res["processed_image"])
        self.assertIn("psnr", res["metrics"])

    def test_image_processing_morphology(self):
        req = ImageProcessRequest(image_name="cameraman", operation="morphology", morph_op="open", strel_shape="disk", strel_radius=3)
        res = process_image(req)
        self.assertIn("data:image/png;base64,", res["processed_image"])

    def test_image_processing_dct(self):
        req = ImageProcessRequest(image_name="cameraman", operation="dct", dct_q=40)
        res = process_image(req)
        self.assertIn("compression_ratio_Ks", res["metrics"])
        self.assertGreater(res["metrics"]["compression_ratio_Ks"], 1.0)

    def test_conv_animation(self):
        req = ConvAnimRequest(x=[1.0, 2.0, 3.0], h=[0.0, 1.0, 0.5])
        res = get_conv_animation(req)
        self.assertEqual(res["true_result"], [0.0, 1.0, 2.5, 4.0, 1.5])
        self.assertEqual(len(res["steps"]), 5)

    def test_speech_analysis(self):
        res = analyze_speech()
        self.assertIn("pitch_hz", res)
        self.assertGreater(res["pitch_hz"], 80)
        self.assertEqual(res["is_voiced"], True)

    def test_knn_classification(self):
        req = KNNClassifyRequest(k_neighbors=3)
        res = knn_classify(req)
        self.assertEqual(res["accuracy_pct"], 100.0)
        self.assertEqual(len(res["test_results"]), 4)

    def test_matlab_workbench_execution(self):
        code = "x = [1, 2, 3]; y = conv(x, [1, 1]); print(y)"
        res = execute_matlab_code(MatlabExecuteRequest(code=code))
        self.assertIn("Dastur muvaffaqiyatli bajarildi", res["output"])
        self.assertTrue(any(v["name"] == "x" for v in res["workspace"]))

    def test_teacher_router(self):
        with Session(engine) as session:
            st = get_students(session=session)
            self.assertGreater(len(st), 0)
            stats = get_teacher_stats(session=session)
            self.assertIn("total_students", stats)
            
            # Progress detail
            prog = get_student_progress(student_id=st[0]["id"], session=session)
            self.assertIn("student", prog)
            self.assertEqual(len(prog["labs"]), 20)

            # CSV export
            csv_res = export_journal_csv(session=session)
            self.assertEqual(csv_res.media_type, "text/csv")
            self.assertGreater(len(csv_res.body), 100)

    def test_assignments_workflow(self):
        with Session(engine) as session:
            # 1. Get assignments
            assignments = get_teacher_assignments(session=session)
            self.assertGreaterEqual(len(assignments), 1)
            target_id = assignments[0]["id"]

            # 2. Student views assignment
            my_assigns = get_my_assignments(user_id=1, current_user=None, session=session)
            self.assertGreaterEqual(len(my_assigns), 1)

            # 3. Student submits solution
            sub_res = submit_assignment_solution(
                assignment_id=target_id,
                req=SubmitAssignmentRequest(solution_text="% Mening Butterworth MATLAB yechimim: [b,a] = butter(4, 0.2);"),
                user_id=1,
                session=session
            )
            self.assertIn("submission_id", sub_res)

            # 4. Teacher grades submission
            grade_res = grade_assignment_submission(
                submission_id=sub_res["submission_id"],
                req=GradeAssignmentRequest(grade=95.0, teacher_feedback="A'lo natija, kod to'g'ri ishladi!"),
                session=session
            )
            self.assertEqual(grade_res["grade"], 95.0)

    def test_attendance_workflow(self):
        with Session(engine) as session:
            # Batch record attendance
            batch_req = AttendanceBatchRequest(
                lesson_date="2026-10-26",
                lab_number=2,
                records=[AttendanceRecordItem(user_id=1, status="present", note="Faol qatnashdi")]
            )
            save_res = mark_attendance_batch(req=batch_req, session=session)
            self.assertIn("count", save_res)

            # Fetch attendance list
            att_data = get_attendance_for_date(date="2026-10-26", group_name="all", session=session)
            self.assertIn("students", att_data)

    def test_ai_router(self):
        chat_res = ai_chat(AIChatRequest(message="Kotelnikov teoremasi nima?", lab_id=4, variant=2))
        self.assertIn("aliasing", chat_res["reply"].lower())

        fix_res = fix_code_error(AIFixRequest(
            code="x = [1, 2, 3]; y = x * [4, 5, 6];",
            error_message="Inner matrix dimensions must agree"
        ))
        self.assertIn("fixed_code", fix_res)

        analysis_res = analyze_metrics(AIAnalyzeRequest(
            lab_id=8,
            metrics={"psnr": 35.4, "rms": 0.707}
        ))
        self.assertIn("PSNR", analysis_res["analysis"])

    def test_admin_router(self):
        with Session(engine) as session:
            users = get_all_users(session=session)
            self.assertGreaterEqual(len(users), 1)

            ai_s = get_ai_settings(session=session)
            self.assertIn("ai_provider", ai_s)

            test_conn = test_ai_connection(session=session)
            self.assertIn("status", test_conn)

            health = get_system_health(session=session)
            self.assertEqual(health["database"]["status"], "connected")
            self.assertEqual(health["status"], "healthy")

            logs = get_audit_logs(session=session)
            self.assertIsInstance(logs, list)

            backup = export_backup_json(session=session)
            self.assertIn("users", backup)
            self.assertIn("version", backup)

    def test_notifications_router(self):
        with Session(engine) as session:
            dummy_user = session.exec(select(User)).first()
            if dummy_user:
                notifs = get_user_notifications(current_user=dummy_user, session=session)
                self.assertIsInstance(notifs, list)

                count = get_unread_count(current_user=dummy_user, session=session)
                self.assertIn("unread_count", count)

                mark_all_res = mark_all_read(current_user=dummy_user, session=session)
                self.assertIn("status", mark_all_res)

    def test_cms_router(self):
        with Session(engine) as session:
            cms_labs = get_all_cms_labs(session=session)
            self.assertEqual(len(cms_labs), 20)

            lab2 = get_cms_lab_detail(lab_number=2, session=session)
            self.assertEqual(lab2["lab_number"], 2)
            self.assertIn("theory_markdown", lab2)

            update_res = save_cms_lab_detail(
                lab_number=2,
                req=LabContentUpdateRequest(
                    title="1D va 2D Signallar Test",
                    aim="Test maqsad",
                    theory_markdown="## Test Nazariya $f_s \\ge 2 f_{max}$",
                    matlab_sample="% test sample\nx = 1:10;",
                    variant_columns=["Variant", "F1", "F2"],
                    variant_rows=[{"Variant": "№ 1", "F1": "10 Hz", "F2": "50 Hz"}]
                ),
                session=session
            )
            self.assertIn("saqlandi", update_res["message"].lower())

    def test_teacher_advanced(self):
        with Session(engine) as session:
            # Test bulk import
            import_req = StudentBatchImportRequest(students=[
                StudentCreateRequest(
                    full_name="Test Talaba Import",
                    email="test_import_unique@signallab.uz",
                    group_name="210-22",
                    variant_number=5
                )
            ])
            import_res = import_students_csv(req=import_req, session=session)
            self.assertIn("added_count", import_res)

if __name__ == "__main__":
    unittest.main()
