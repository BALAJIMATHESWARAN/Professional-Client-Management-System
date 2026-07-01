using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PCMS.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class EnhanceDoctorModule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "DoctorId",
                table: "ReceptionistProfiles",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "DoctorId",
                table: "NurseProfiles",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EntityName",
                table: "DynamicFields",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "DynamicRecordId",
                table: "DoctorProfiles",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_ReceptionistProfiles_DoctorId",
                table: "ReceptionistProfiles",
                column: "DoctorId");

            migrationBuilder.CreateIndex(
                name: "IX_NurseProfiles_DoctorId",
                table: "NurseProfiles",
                column: "DoctorId");

            migrationBuilder.CreateIndex(
                name: "IX_DoctorProfiles_DynamicRecordId",
                table: "DoctorProfiles",
                column: "DynamicRecordId");

            migrationBuilder.AddForeignKey(
                name: "FK_DoctorProfiles_DynamicRecords_DynamicRecordId",
                table: "DoctorProfiles",
                column: "DynamicRecordId",
                principalTable: "DynamicRecords",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_NurseProfiles_DoctorProfiles_DoctorId",
                table: "NurseProfiles",
                column: "DoctorId",
                principalTable: "DoctorProfiles",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_ReceptionistProfiles_DoctorProfiles_DoctorId",
                table: "ReceptionistProfiles",
                column: "DoctorId",
                principalTable: "DoctorProfiles",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_DoctorProfiles_DynamicRecords_DynamicRecordId",
                table: "DoctorProfiles");

            migrationBuilder.DropForeignKey(
                name: "FK_NurseProfiles_DoctorProfiles_DoctorId",
                table: "NurseProfiles");

            migrationBuilder.DropForeignKey(
                name: "FK_ReceptionistProfiles_DoctorProfiles_DoctorId",
                table: "ReceptionistProfiles");

            migrationBuilder.DropIndex(
                name: "IX_ReceptionistProfiles_DoctorId",
                table: "ReceptionistProfiles");

            migrationBuilder.DropIndex(
                name: "IX_NurseProfiles_DoctorId",
                table: "NurseProfiles");

            migrationBuilder.DropIndex(
                name: "IX_DoctorProfiles_DynamicRecordId",
                table: "DoctorProfiles");

            migrationBuilder.DropColumn(
                name: "DoctorId",
                table: "ReceptionistProfiles");

            migrationBuilder.DropColumn(
                name: "DoctorId",
                table: "NurseProfiles");

            migrationBuilder.DropColumn(
                name: "EntityName",
                table: "DynamicFields");

            migrationBuilder.DropColumn(
                name: "DynamicRecordId",
                table: "DoctorProfiles");
        }
    }
}
